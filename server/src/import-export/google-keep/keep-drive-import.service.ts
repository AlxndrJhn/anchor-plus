import { randomUUID } from 'crypto';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Express } from 'express';
import { GoogleDriveImportConfig } from '../../config/configuration';
import { ATTACHMENT_MAX_FILE_SIZE } from '../../notes/constants/notes.constants';
import { IMPORT_MAX_NOTES_PER_BATCH } from '../constants/import.constants';
import { ImportService } from '../import.service';
import type { ImportNoteResult } from '../dto/import-notes.dto';
import {
  DriveDownloadError,
  DRIVE_FILE_ID_RE,
  downloadDriveFile,
  driveFileInfo,
} from './google-drive';
import {
  type KeepNote,
  type KeepSkipped,
  keepJsonCandidates,
  keepNotesToImport,
  parseKeepNote,
} from './keep-mapping';
import { TakeoutArchive } from './takeout-archive';

const MB = 1024 * 1024;
/** A Keep note's .json is a few KB; anything far larger is not one. */
const MAX_NOTE_JSON_BYTES = 2 * MB;
/** Finished jobs stay readable this long, for the page that started them. */
const JOB_TTL_MS = 60 * 60 * 1000;

export type KeepImportPhase =
  'downloading' | 'reading' | 'notes' | 'attachments' | 'done' | 'failed';

export interface KeepImportJobView {
  id: string;
  phase: KeepImportPhase;
  /** Bytes for downloading, notes or files for the later phases. */
  done: number;
  total: number;
  notesCreated: number;
  attachmentsImported: number;
  skipped: KeepSkipped[];
  error?: string;
}

interface KeepImportJob extends KeepImportJobView {
  userId: string;
  finishedAt?: number;
}

export interface KeepDriveImportRequest {
  fileIds: string[];
  accessToken: string;
}

/**
 * Imports a Google Keep export that the person put in their Google Drive
 * with Takeout and picked in the Google Picker. Runs in the background; the
 * web app follows it through job().
 */
@Injectable()
export class KeepDriveImportService implements OnModuleDestroy {
  private readonly logger = new Logger(KeepDriveImportService.name);
  private readonly jobs = new Map<string, KeepImportJob>();
  private readonly running = new Set<Promise<void>>();

  constructor(
    private readonly importService: ImportService,
    @Inject(GoogleDriveImportConfig.KEY)
    private readonly config: ConfigType<typeof GoogleDriveImportConfig>,
  ) {}

  /** What the web app needs to open the Picker; nothing secret. */
  clientConfig() {
    if (!this.config.enabled) return { enabled: false as const };
    return {
      enabled: true as const,
      clientId: this.config.clientId,
      apiKey: this.config.apiKey,
      appId: this.config.appId,
    };
  }

  start(userId: string, request: KeepDriveImportRequest): { jobId: string } {
    if (!this.config.enabled) {
      throw new NotFoundException(
        'Importing from Google Drive is off on this server',
      );
    }
    const fileIds = [...new Set(request.fileIds)];
    if (!fileIds.every((id) => DRIVE_FILE_ID_RE.test(id))) {
      throw new BadRequestException('Not a Google Drive file');
    }
    this.forgetOldJobs();
    const busy = [...this.jobs.values()].some(
      (job) => job.userId === userId && !job.finishedAt,
    );
    if (busy) {
      throw new ConflictException(
        'An import from Google Keep is already running',
      );
    }

    const job: KeepImportJob = {
      id: randomUUID(),
      userId,
      phase: 'downloading',
      done: 0,
      total: 0,
      notesCreated: 0,
      attachmentsImported: 0,
      skipped: [],
    };
    this.jobs.set(job.id, job);

    const run = this.run(job, fileIds, request.accessToken)
      .catch((error: unknown) => {
        job.phase = 'failed';
        job.error =
          error instanceof DriveDownloadError ||
          error instanceof NoKeepNotesError
            ? error.message
            : 'The import stopped; notes imported so far were kept';
        if (!(
          error instanceof DriveDownloadError ||
          error instanceof NoKeepNotesError
        )) {
          this.logger.error('Google Keep import failed', error as Error);
        }
      })
      .finally(() => {
        job.finishedAt = Date.now();
        this.running.delete(run);
      });
    this.running.add(run);
    return { jobId: job.id };
  }

  job(userId: string, jobId: string): KeepImportJobView {
    const job = this.jobs.get(jobId);
    if (!job || job.userId !== userId) {
      throw new NotFoundException('No such import');
    }
    const { userId: _owner, finishedAt: _finished, ...view } = job;
    return view;
  }

  async onModuleDestroy() {
    await Promise.allSettled([...this.running]);
  }

  private async run(
    job: KeepImportJob,
    fileIds: string[],
    accessToken: string,
  ) {
    const maxBytes = this.config.maxMb * MB;
    const infos = await Promise.all(
      fileIds.map((id) => driveFileInfo(id, accessToken)),
    );
    job.total = infos.reduce((sum, info) => sum + info.size, 0);
    if (job.total > maxBytes) {
      throw new DriveDownloadError(
        'The export is larger than this server accepts',
      );
    }

    const dir = await mkdtemp(join(tmpdir(), 'anchor-keep-'));
    let archive: TakeoutArchive | undefined;
    try {
      const paths: string[] = [];
      for (const [index, fileId] of fileIds.entries()) {
        const path = join(dir, `part-${index}.zip`);
        await downloadDriveFile(
          fileId,
          accessToken,
          path,
          maxBytes - job.done,
          (bytes) => (job.done += bytes),
        );
        paths.push(path);
      }

      job.phase = 'reading';
      try {
        archive = await TakeoutArchive.open(paths);
      } catch {
        throw new NoKeepNotesError('That file is not a Takeout ZIP export');
      }
      await this.importArchive(job, archive);
      job.phase = 'done';
    } finally {
      archive?.close();
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async importArchive(job: KeepImportJob, archive: TakeoutArchive) {
    const names = archive.names;
    const found: { entry: string; note: KeepNote }[] = [];
    for (const entry of keepJsonCandidates(names)) {
      if (archive.size(entry) > MAX_NOTE_JSON_BYTES) continue;
      const note = parseKeepNote(
        (await archive.read(entry, MAX_NOTE_JSON_BYTES)).toString('utf8'),
      );
      if (note) found.push({ entry, note });
    }
    if (!found.length) {
      throw new NoKeepNotesError('No Google Keep notes in this export');
    }

    const { notes, skipped } = keepNotesToImport(found, names);
    job.skipped.push(...skipped);

    job.phase = 'notes';
    job.done = 0;
    job.total = notes.length;
    const results = new Map<string, ImportNoteResult>();
    for (let i = 0; i < notes.length; i += IMPORT_MAX_NOTES_PER_BATCH) {
      const batch = notes.slice(i, i + IMPORT_MAX_NOTES_PER_BATCH);
      const tags = [
        ...new Set(batch.flatMap(({ item }) => item.tagNames ?? [])),
      ].map((name) => ({ name }));
      const response = await this.importService.importNotes(job.userId, {
        notes: batch.map(({ item }) => item),
        tags,
      });
      for (const result of response.results) {
        results.set(result.ref, result);
        if (result.status === 'created' || result.status === 'remapped') {
          job.notesCreated++;
        } else if (result.status === 'failed') {
          job.skipped.push({
            item: result.ref.replace(/^keep:/, ''),
            reason: result.error ?? 'Could not be imported',
          });
        }
      }
      job.done += batch.length;
    }

    const uploads = notes.flatMap(({ item, attachments }) => {
      const noteId = results.get(item.ref)?.noteId;
      return noteId
        ? attachments.map((attachment, position) => ({
            noteId,
            position,
            attachment,
          }))
        : [];
    });
    job.phase = 'attachments';
    job.done = 0;
    job.total = uploads.length;
    for (const { noteId, position, attachment } of uploads) {
      try {
        const buffer = await archive.read(
          attachment.entry,
          ATTACHMENT_MAX_FILE_SIZE,
        );
        const file = {
          buffer,
          size: buffer.length,
          originalname: attachment.filename,
          mimetype: attachment.mimeType,
        } as Express.Multer.File;
        await this.importService.importAttachment(
          job.userId,
          noteId,
          file,
          position,
        );
        job.attachmentsImported++;
      } catch (error) {
        job.skipped.push({
          item: attachment.filename,
          reason:
            error instanceof PayloadTooLargeException
              ? 'Your storage is full'
              : 'File could not be imported',
        });
      }
      job.done++;
    }
  }

  private forgetOldJobs() {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.finishedAt && now - job.finishedAt > JOB_TTL_MS)
        this.jobs.delete(id);
    }
  }
}

class NoKeepNotesError extends Error {}
