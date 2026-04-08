const todoText = document.getElementById("todoText");
const dueDate = document.getElementById("dueDate");
const addBtn = document.getElementById("addBtn");
const todoList = document.getElementById("todoList");
const clearBtn = document.getElementById("clearBtn");
let tasks = [];

function addTask() {
    const task = todoText.value.trim();
    const deadline = dueDate.value;

    if (task === "") return;

    const newTask = {
        id: Date.now(),
        text: task,
        dueDate: deadline,
        completed: false
    };

    tasks.push(newTask);
    saveTasks();
    renderTask(newTask);

    todoText.value = "";
    dueDate.value = "";
}

function formatDueDate(dateString) {
    if (!dateString) return "No due date";

    const date = new Date(`${dateString}T00:00:00`);
    return `Due: ${date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    })}`;
}

function isOverdue(dateString, completed) {
    if (!dateString || completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(`${dateString}T00:00:00`);
    return due < today;
}

function createTaskDateElement(taskObj) {
    const taskDate = document.createElement("span");
    taskDate.className = "task-date";
    taskDate.textContent = formatDueDate(taskObj.dueDate);
    taskDate.classList.toggle("overdue", isOverdue(taskObj.dueDate, taskObj.completed));
    return taskDate;
}

function renderTask(taskObj) {
    const li = document.createElement("li");
    li.dataset.id = String(taskObj.id);
    li.draggable = true;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("task-check");
    checkbox.checked = taskObj.completed;

    const taskDetails = document.createElement("div");
    taskDetails.className = "task-details";

    const taskText = document.createElement("span");
    taskText.textContent = taskObj.text;
    taskText.classList.add("task-text");

    const taskDate = createTaskDateElement(taskObj);

    taskDetails.appendChild(taskText);
    taskDetails.appendChild(taskDate);

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.classList.add("edit-btn");

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.classList.add("delete-btn");

    const actionWrapper = document.createElement("div");
    actionWrapper.classList.add("action-wrapper");
    actionWrapper.appendChild(editBtn);
    actionWrapper.appendChild(deleteBtn);

    if (taskObj.completed) {
        li.classList.add("completed");
    }

    checkbox.addEventListener("change", () => {
        taskObj.completed = checkbox.checked;
        li.classList.toggle("completed", taskObj.completed);
        taskDate.classList.toggle("overdue", isOverdue(taskObj.dueDate, taskObj.completed));
        saveTasks();
    });

    editBtn.addEventListener("click", () => {
        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.value = taskObj.text;
        textInput.className = "edit-input";

        const dateInput = document.createElement("input");
        dateInput.type = "date";
        dateInput.value = taskObj.dueDate || "";
        dateInput.className = "edit-date-input";

        taskDetails.replaceChild(textInput, taskText);
        taskDetails.replaceChild(dateInput, taskDate);
        textInput.focus();

        function finishEditing() {
            const newText = textInput.value.trim();
            if (newText) {
                taskObj.text = newText;
            }

            taskObj.dueDate = dateInput.value;
            saveTasks();

            taskText.textContent = taskObj.text;
            taskDate.textContent = formatDueDate(taskObj.dueDate);
            taskDate.classList.toggle("overdue", isOverdue(taskObj.dueDate, taskObj.completed));

            if (taskDetails.contains(textInput)) {
                taskDetails.replaceChild(taskText, textInput);
            }
            if (taskDetails.contains(dateInput)) {
                taskDetails.replaceChild(taskDate, dateInput);
            }
        }

        textInput.addEventListener("blur", finishEditing);
        textInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") finishEditing();
        });

        dateInput.addEventListener("change", finishEditing);
        dateInput.addEventListener("blur", finishEditing);
    });

    deleteBtn.addEventListener("click", () => {
        li.classList.add("fade-out");
        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== taskObj.id);
            saveTasks();
            li.remove();
        }, 400);
    });

    li.addEventListener("dragstart", (event) => {
        li.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";

        const clone = li.cloneNode(true);
        clone.style.width = getComputedStyle(li).width;
        clone.style.opacity = "0.8";
        clone.style.position = "absolute";
        clone.style.top = "-9999px";
        document.body.appendChild(clone);
        event.dataTransfer.setDragImage(clone, 20, 20);
        setTimeout(() => document.body.removeChild(clone), 0);
    });

    li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        persistOrderFromDOM();
    });

    li.appendChild(handle);
    li.appendChild(checkbox);
    li.appendChild(taskDetails);
    li.appendChild(actionWrapper);
    li.classList.add("fade-in");
    todoList.appendChild(li);
}

function clearCompleted() {
    const allTasks = document.querySelectorAll("#todoList li");

    allTasks.forEach((taskElement) => {
        if (taskElement.classList.contains("completed")) {
            taskElement.classList.add("fade-out");
            setTimeout(() => {
                taskElement.remove();
            }, 400);
        }
    });

    tasks = tasks.filter(task => !task.completed);
    saveTasks();
}

function saveTasks() {
    localStorage.setItem("todoTasks", JSON.stringify(tasks));
}

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll("li:not(.dragging)")];

    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);

        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }

        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

todoList.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const afterElement = getDragAfterElement(todoList, event.clientY);
    const dragging = document.querySelector(".dragging");
    if (!dragging) return;

    [...todoList.children].forEach(item => item.classList.remove("reorder-shadow"));

    if (afterElement == null) {
        todoList.appendChild(dragging);
    } else {
        afterElement.classList.add("reorder-shadow");
        todoList.insertBefore(dragging, afterElement);
    }
});

todoList.addEventListener("drop", () => {
    persistOrderFromDOM();
});

todoList.addEventListener("dragleave", () => {
    [...todoList.children].forEach(item => item.classList.remove("reorder-shadow"));
});

function persistOrderFromDOM() {
    const order = [...todoList.children].map(item => Number(item.dataset.id));
    const positions = new Map(order.map((id, index) => [id, index]));
    tasks.sort((a, b) => (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0));
    saveTasks();
}

addBtn.addEventListener("click", addTask);
clearBtn.addEventListener("click", clearCompleted);

todoText.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTask();
});

window.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("todoTasks");

    try {
        const savedTasks = saved ? JSON.parse(saved) : [];
        tasks = Array.isArray(savedTasks) ? savedTasks : [];
    } catch {
        tasks = [];
    }

    tasks.forEach(task => renderTask(task));
});