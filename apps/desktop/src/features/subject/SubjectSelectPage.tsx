import { FlaskConical, Microscope, Pill, Radar } from "lucide-react";
import { useAppStore } from "../../app/store";
import { SUBJECTS } from "./subjects";

const icons = [Pill, Radar, FlaskConical, Microscope];

export function SubjectSelectPage() {
  const selectSubject = useAppStore((state) => state.selectSubject);

  return (
    <main className="subject-start-page">
      <section className="subject-card-grid" aria-label="选择科目">
        {SUBJECTS.map((subject, index) => {
          const Icon = icons[index];
          return (
            <button
              type="button"
              className={`subject-choice-card glass-panel interactive-lift theme-${subject.themeKey}`}
              key={subject.id}
              onClick={() => selectSubject(subject.id)}
            >
              <span className="subject-choice-mark" aria-hidden="true">
                <Icon size={28} />
              </span>
              <span className="subject-choice-name">{subject.name}</span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
