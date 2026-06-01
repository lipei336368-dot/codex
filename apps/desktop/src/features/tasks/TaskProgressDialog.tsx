import type { TaskProgressDto } from "../../shared/api/contracts";
import { Dialog } from "../../shared/components/Dialog";

type TaskProgressDialogProps = {
  open: boolean;
  task: TaskProgressDto | null;
  onClose: () => void;
};

export function TaskProgressDialog({ open, task, onClose }: TaskProgressDialogProps) {
  if (!task) {
    return null;
  }

  const max = task.total > 0 ? task.total : 100;
  const percent = task.total > 0 ? Math.round((task.current / task.total) * 100) : 0;

  return (
    <Dialog open={open} title={task.title} onClose={onClose}>
      <div className="task-progress-dialog">
        <p>{task.message}</p>
        <progress value={task.current} max={max} aria-valuenow={task.current} />
        <span>{percent}%</span>
      </div>
    </Dialog>
  );
}
