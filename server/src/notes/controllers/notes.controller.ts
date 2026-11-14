import { NotePositionDto } from '../dto/note-position.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotesService } from '../services/notes.service';
import { CreateNoteDto } from '../dto/create-note.dto';
import { UpdateNoteDto } from '../dto/update-note.dto';
import { BulkActionDto } from '../dto/bulk-action.dto';
import { BulkPinDto } from '../dto/bulk-pin.dto';
import { BulkLockDto, NoteLockDto } from '../dto/note-lock.dto';
import { BulkFreezeDto, NoteFreezeDto } from '../dto/note-freeze.dto';
import { BulkTagsDto } from '../dto/bulk-tags.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('api/notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.create(userId, createNoteDto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('tagId') tagId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notesService.findAll(userId, search, tagId, parseLimit(limit));
  }

  @Get('trash')
  findTrashed(@CurrentUser('id') userId: string) {
    return this.notesService.findTrashed(userId);
  }

  @Get('archive')
  findArchived(@CurrentUser('id') userId: string) {
    return this.notesService.findArchived(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notesService.findOne(userId, id);
  }

  @Patch(':id/position')
  setPosition(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: NotePositionDto,
  ) {
    return this.notesService.setPosition(userId, id, dto.position);
  }

  @Patch(':id/lock')
  setLock(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: NoteLockDto,
  ) {
    return this.notesService.setLock(userId, id, dto.lock);
  }

  @Patch(':id/freeze')
  setFrozen(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: NoteFreezeDto,
  ) {
    return this.notesService.setFrozen(userId, id, dto.isFrozen);
  }

  @Post(':id/copy')
  copy(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notesService.copy(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(userId, id, updateNoteDto);
  }

  @Patch(':id/restore')
  restore(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notesService.restore(userId, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('trashedAt') trashedAt?: string,
  ) {
    return this.notesService.remove(userId, id, trashedAt);
  }

  @Delete(':id/permanent')
  permanentDelete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notesService.permanentDelete(userId, id);
  }

  @Post('bulk/delete')
  bulkDelete(
    @CurrentUser('id') userId: string,
    @Body() bulkActionDto: BulkActionDto,
  ) {
    return this.notesService.bulkRemove(userId, bulkActionDto.noteIds);
  }

  @Post('bulk/archive')
  bulkArchive(
    @CurrentUser('id') userId: string,
    @Body() bulkActionDto: BulkActionDto,
  ) {
    return this.notesService.bulkArchive(userId, bulkActionDto.noteIds);
  }

  @Post('bulk/pin')
  bulkPin(@CurrentUser('id') userId: string, @Body() bulkPinDto: BulkPinDto) {
    return this.notesService.bulkSetPin(
      userId,
      bulkPinDto.noteIds,
      bulkPinDto.isPinned,
    );
  }

  @Post('bulk/lock')
  bulkLock(@CurrentUser('id') userId: string, @Body() dto: BulkLockDto) {
    return this.notesService.bulkSetLock(userId, dto.noteIds, dto.lock);
  }

  @Post('bulk/freeze')
  bulkFreeze(@CurrentUser('id') userId: string, @Body() dto: BulkFreezeDto) {
    return this.notesService.bulkSetFrozen(userId, dto.noteIds, dto.isFrozen);
  }

  @Post('bulk/tags')
  bulkAddTags(
    @CurrentUser('id') userId: string,
    @Body() bulkTagsDto: BulkTagsDto,
  ) {
    return this.notesService.bulkAddTags(
      userId,
      bulkTagsDto.noteIds,
      bulkTagsDto.tagIds,
    );
  }
}

const parseLimit = (limit?: string) => {
  if (!limit) {
    return undefined;
  }

  const parsed = Number.parseInt(limit, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};
