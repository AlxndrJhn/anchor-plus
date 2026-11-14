import { CircleCheck } from "lucide-react";
import * as React from "react";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  cardCodeLines,
  type DoneRow,
  foldTickedItems,
  type InlineRun,
  type NoteBlock,
} from "../note-blocks";
import { inkFor, isHexColor } from "../text-style";

const CARD_CODE_LINES = 3;

type ListKind = "check" | "bullet" | "ordered";
type Row = NoteBlock | DoneRow;
type Segment =
  | { key: number; list: ListKind; items: { key: number; block: NoteBlock }[] }
  | { key: number; row: Row };

interface NoteBodyProps {
  blocks: NoteBlock[];
  variant?: "card" | "full";
  maxRows?: number;
  className?: string;
  /** Makes checklist boxes tickable; gets the item's line and new state. */
  onToggle?: (line: number, done: boolean) => void;
  ref?: React.Ref<HTMLDivElement>;
}

const isList = (t: Row["type"]): t is ListKind =>
  t === "check" || t === "bullet" || t === "ordered";

function toSegments(rows: Row[]): Segment[] {
  const segments: Segment[] = [];
  rows.forEach((row, key) => {
    const last = segments[segments.length - 1];
    if (isList(row.type) && "level" in row) {
      if (last && "list" in last && last.list === row.type)
        last.items.push({ key, block: row });
      else segments.push({ key, list: row.type, items: [{ key, block: row }] });
    } else segments.push({ key, row });
  });
  return segments;
}

export function NoteBody({
  blocks,
  variant = "full",
  maxRows = Number.POSITIVE_INFINITY,
  className,
  ref,
  onToggle,
}: NoteBodyProps) {
  const t = translate("notes.noteBody");
  const card = variant === "card";
  const shown = blocks.filter(
    (b) => (b.type === "code" && !card) || b.runs.some((r) => r.text.trim()),
  );
  let rows: Row[] = card ? foldTickedItems(shown) : shown;
  const truncated = rows.length > maxRows;
  rows = rows.slice(0, maxRows);

  return (
    <div
      ref={ref}
      className={cn(
        "doc",
        card && "is-card",
        card && truncated && "cut",
        className,
      )}
    >
      {toSegments(rows).map((segment) => {
        if ("list" in segment) {
          const Tag = segment.list === "ordered" ? "ol" : "ul";
          return (
            <Tag
              key={segment.key}
              className={
                { check: "lst ck", bullet: "lst bul", ordered: "lst num" }[
                  segment.list
                ]
              }
            >
              {segment.items.map(({ key, block }) => (
                <li
                  key={key}
                  dir="auto"
                  data-lvl={block.level}
                  style={{ "--lvl": block.level } as React.CSSProperties}
                  className={block.done ? "done" : undefined}
                >
                  {block.type === "check" &&
                  onToggle &&
                  block.line !== undefined ? (
                    <button
                      type="button"
                      className="box tick"
                      aria-pressed={!!block.done}
                      aria-label={t(block.done ? "untickItem" : "tickItem", {
                        text: block.runs.map((r) => r.text).join(""),
                      })}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle(block.line as number, !block.done);
                      }}
                    />
                  ) : block.type === "check" ? (
                    <span className="box" aria-hidden />
                  ) : (
                    <span className="mk" aria-hidden>
                      {block.type === "ordered" ? block.marker : ""}
                    </span>
                  )}
                  <span className="tx">
                    {block.type === "check" && (
                      // Its own dir keeps this English label out of the
                      // li's dir="auto", which reads the item's text.
                      <span className="sr-only" dir="ltr">
                        {block.done ? t("checked") : t("notChecked")}
                      </span>
                    )}
                    <TextRuns runs={block.runs} card={card} />
                  </span>
                </li>
              ))}
            </Tag>
          );
        }
        return <Block key={segment.key} row={segment.row} card={card} />;
      })}
    </div>
  );
}

function Block({ row, card }: { row: Row; card: boolean }) {
  if (row.type === "done") {
    const t = translate("notes.noteBody");
    return (
      <div className="sum">
        <CircleCheck aria-hidden />
        {row.isAll && row.count > 1
          ? t("allDone", { count: row.count })
          : t("someDone", { count: row.count })}
      </div>
    );
  }
  const block = row as NoteBlock;
  const text = <TextRuns runs={block.runs} card={card} />;
  if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
    const headingClass = `x-${block.type}`;
    if (card)
      return (
        <p className={headingClass} dir="auto">
          {text}
        </p>
      );
    const Tag = ({ h1: "h2", h2: "h3", h3: "h4" } as const)[block.type];
    return (
      <Tag className={headingClass} dir="auto">
        {text}
      </Tag>
    );
  }
  if (block.type === "quote") return <blockquote dir="auto">{text}</blockquote>;
  if (block.type === "code") {
    const code = block.runs.map((r) => r.text).join("");
    const preview = card ? cardCodeLines(code, CARD_CODE_LINES) : null;
    return (
      <div className="code-wrap">
        <pre className={cn("code", preview?.isCut && "cut")}>
          {preview ? preview.lines.join("\n") : code}
        </pre>
      </div>
    );
  }
  return <p dir="auto">{text}</p>;
}

export function TextRuns({ runs, card }: { runs: InlineRun[]; card: boolean }) {
  return runs.map((run, i) => {
    let node: React.ReactNode = run.text;
    if (run.code) node = <code>{node}</code>;
    if (run.strike) node = <s>{node}</s>;
    if (run.underline) node = <u>{node}</u>;
    if (run.italic) node = <em>{node}</em>;
    if (run.bold) node = <strong>{node}</strong>;
    if (run.color || run.font)
      node = (
        <span style={{ color: run.color, fontFamily: run.font }}>{node}</span>
      );
    if (run.highlight)
      node = isHexColor(run.highlight) ? (
        <mark
          className="hl"
          data-hl="custom"
          style={
            {
              "--hl-custom": run.highlight,
              "--hl-custom-ink": inkFor(run.highlight),
            } as React.CSSProperties
          }
        >
          {node}
        </mark>
      ) : (
        <mark className="hl" data-hl={run.highlight}>
          {node}
        </mark>
      );
    if (run.link)
      node = card ? (
        <span className="lnk">{node}</span>
      ) : (
        <a
          className="lnk"
          href={run.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {node}
        </a>
      );
    return <React.Fragment key={i}>{node}</React.Fragment>;
  });
}
