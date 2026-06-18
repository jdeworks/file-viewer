type Task = {
  id: number;
  title: string;
  done: boolean;
};

const tasks: Task[] = [
  { id: 1, title: "Parse samples", done: true },
  { id: 2, title: "Render preview", done: false },
];

export function openTasks(items: Task[]): Task[] {
  return items.filter((task) => !task.done);
}

console.log(openTasks(tasks).map((task) => task.title).join(", "));
