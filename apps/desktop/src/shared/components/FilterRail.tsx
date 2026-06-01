import type { ChapterDto } from "../api/contracts";

type FilterRailProps = {
  title: string;
  chapters: ChapterDto[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string | null) => void;
};

export function FilterRail({
  title,
  chapters,
  selectedChapterId,
  onSelectChapter
}: FilterRailProps) {
  return (
    <aside className="filter-rail glass-panel" aria-label={title}>
      <section className="filter-section">
        <h3>章节</h3>
        <button
          type="button"
          className={selectedChapterId === null ? "filter-item active" : "filter-item"}
          onClick={() => onSelectChapter(null)}
        >
          全部章节
        </button>
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            type="button"
            className={chapter.id === selectedChapterId ? "filter-item active" : "filter-item"}
            onClick={() => onSelectChapter(chapter.id)}
          >
            <span>{chapter.name}</span>
            {chapter.noRequirement ? <small>不做要求</small> : null}
          </button>
        ))}
      </section>
    </aside>
  );
}
