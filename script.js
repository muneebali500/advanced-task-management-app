// app.js - Optimized Vivid Tasks Application

class VividTasks {
  constructor() {
    this.tasks = this._safeParseJSON(localStorage.getItem("vividTasks")) || [];
    this.currentFilter = "all";
    this.currentSort = "manual";
    this.editingTaskId = null;
    this.draggedItem = null;
    this.timers = {};

    // ── Cache all DOM references once ──────────────────────────────────────
    this.dom = {
      taskList: document.getElementById("todoList"),
      emptyState: document.getElementById("emptyState"),
      todoForm: document.getElementById("todoForm"),
      todoText: document.getElementById("todoText"),
      todoDue: document.getElementById("todoDue"),
      todoPriority: document.getElementById("todoPriority"),
      todoTag: document.getElementById("todoTag"),
      submitBtnText: document.getElementById("submitBtnText"),
      searchInput: document.getElementById("searchInput"),
      searchContainer: document.getElementById("searchContainer"),
      toastHost: document.getElementById("toastHost"),
      sortBy: document.getElementById("sortBy"),
      btnNewTask: document.getElementById("btnNewTask"),
      btnCloseCreator: document.getElementById("btnCloseCreator"),
      btnCancelTask: document.getElementById("btnCancelTask"),
      btnEmptyNewTask: document.getElementById("btnEmptyNewTask"),
      btnClearDone: document.getElementById("btnClearDone"),
      btnClearSearch: document.getElementById("btnClearSearch"),
      btnSearchToggle: document.getElementById("btnSearchToggle"),
      btnNotifications: document.getElementById("btnNotifications"),
      btnCloseDetail: document.getElementById("btnCloseDetail"),
      menuToggle: document.getElementById("menuToggle"),
      sidebar: document.getElementById("sidebar"),
      sidebarOverlay: document.getElementById("sidebarOverlay"),
      popupOverlay: document.getElementById("popupOverlay"),
      closePopupBtn: document.getElementById("closePopupBtn"),
      taskCreator: document.querySelector(".task-creator"),
      taskDetail: document.querySelector(".task-detail"),
      detailContent: document.querySelector(".detail-content"),
      // Stats
      countTotal: document.getElementById("countTotal"),
      countActive: document.getElementById("countActive"),
      countDone: document.getElementById("countDone"),
      countToday: document.getElementById("countToday"),
      countUpcoming: document.getElementById("countUpcoming"),
      activeTaskCount: document.getElementById("activeTaskCount"),
      todayCount: document.getElementById("todayCount"),
      overdueCount: document.getElementById("overdueCount"),
      completionRate: document.getElementById("completionRate"),
      completedTasksCount: document.getElementById("completedTasksCount"),
    };

    // ── Lookup maps (avoid repeated object literals in render loops) ────────
    this.PRIORITY_LABELS = { high: "High", med: "Medium", low: "Low" };
    this.PRIORITY_COLORS = { high: "#ef4444", med: "#f59e0b", low: "#10b981" };
    this.CATEGORY_LABELS = {
      work: "Work",
      personal: "Personal",
      health: "Health",
      learning: "Learning",
      other: "Other",
    };
    this.PRIORITY_ORDER = { high: 3, med: 2, low: 1 };
    this.TOAST_ICONS = {
      success: "fa-check-circle",
      warning: "fa-exclamation-triangle",
      danger: "fa-times-circle",
      info: "fa-info-circle",
    };

    this.init();
  }

  // ── Safe JSON parse — prevents crash on corrupted localStorage data ───────
  _safeParseJSON(value) {
    try {
      return JSON.parse(value);
    } catch {
      console.warn("VividTasks: corrupted localStorage data — resetting.");
      return null;
    }
  }

  init() {
    this.setupEventListeners();
    this.renderTasks();
    this.updateStats();
    this.setupDragAndDrop();
  }

  setupEventListeners() {
    const d = this.dom;

    d.todoForm.addEventListener("submit", (e) => this.handleFormSubmit(e));

    document
      .querySelectorAll(".quick-action")
      .forEach((btn) =>
        btn.addEventListener("click", (e) => this.handleQuickDate(e)),
      );

    document
      .querySelectorAll(".priority-option")
      .forEach((btn) =>
        btn.addEventListener("click", (e) => this.handlePrioritySelect(e)),
      );

    document
      .querySelectorAll(".category-option")
      .forEach((btn) =>
        btn.addEventListener("click", (e) => this.handleCategorySelect(e)),
      );

    d.btnNewTask.addEventListener("click", () => this.toggleTaskCreator(true));
    d.btnCloseCreator.addEventListener("click", () =>
      this.toggleTaskCreator(false),
    );
    d.btnCancelTask.addEventListener("click", () =>
      this.toggleTaskCreator(false),
    );

    if (d.btnEmptyNewTask) {
      d.btnEmptyNewTask.addEventListener("click", () =>
        this.toggleTaskCreator(true),
      );
    }

    document
      .querySelectorAll(".filter-chip")
      .forEach((chip) =>
        chip.addEventListener("click", (e) => this.handleFilterClick(e)),
      );

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const filter = e.currentTarget.getAttribute("data-filter") || "all";
        this.setFilter(filter);
        document
          .querySelectorAll(".nav-item")
          .forEach((nav) => nav.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.closeSidebar();
      });
    });

    d.sortBy.addEventListener("change", (e) => {
      this.currentSort = e.target.value;
      this.renderTasks();
    });

    // ── Debounced search — avoids re-rendering on every keystroke ──────────
    d.searchInput.addEventListener(
      "input",
      this._debounce(() => this.renderTasks(), 200),
    );

    d.btnSearchToggle.addEventListener("click", () => {
      d.searchContainer.classList.toggle("active");
      if (d.searchContainer.classList.contains("active")) {
        d.searchInput.focus();
      }
    });

    d.btnClearDone.addEventListener("click", () => this.clearCompletedTasks());
    d.btnClearSearch.addEventListener("click", () => {
      d.searchInput.value = "";
      this.renderTasks();
    });

    d.menuToggle.addEventListener("click", () => this.toggleSidebar());
    d.sidebarOverlay.addEventListener("click", () => this.closeSidebar());
    d.btnCloseDetail.addEventListener("click", () => this.closeTaskDetail());

    d.btnNotifications.addEventListener("click", () => {
      d.popupOverlay.classList.add("active");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    });
    d.closePopupBtn.addEventListener("click", () => {
      d.popupOverlay.classList.remove("active");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    });
    d.popupOverlay.addEventListener("click", (e) => {
      if (e.target === d.popupOverlay) {
        d.popupOverlay.classList.remove("active");
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    });

    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement.tagName;
      if (
        e.key === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        tag !== "INPUT" &&
        tag !== "TEXTAREA"
      ) {
        e.preventDefault();
        this.toggleTaskCreator(true);
      }
      if (e.key === "Escape") {
        this.toggleTaskCreator(false);
        this.closeTaskDetail();
        this.closeSidebar();
        d.popupOverlay.classList.remove("active");
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    });

    this.setPriority("med");
    this.setCategory("work");
  }

  // ── Generic debounce helper ───────────────────────────────────────────────
  _debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const d = this.dom;

    if (!d.todoText.value.trim()) {
      this.showToast("Please enter a task title", "warning");
      return;
    }

    const taskData = {
      id: this.editingTaskId || Date.now().toString(),
      title: d.todoText.value.trim(),
      dueDate: d.todoDue.value || null,
      priority: d.todoPriority.value,
      category: d.todoTag.value || "work",
      completed: false,
      createdAt: new Date().toISOString(),
      order: this.tasks.length,
      timeSpent: 0,
    };

    if (this.editingTaskId) {
      const index = this.tasks.findIndex((t) => t.id === this.editingTaskId);
      if (index !== -1) {
        taskData.completed = this.tasks[index].completed;
        taskData.createdAt = this.tasks[index].createdAt;
        taskData.timeSpent = this.tasks[index].timeSpent || 0;
        this.tasks[index] = taskData;
        this.showToast("Task updated successfully", "success");
      }
      this.showTaskDetail(this.editingTaskId);
      this.editingTaskId = null;
      d.submitBtnText.textContent = "Add Task";
    } else {
      this.tasks.push(taskData);
      this.showToast("Task added successfully", "success");
    }

    this.saveTasks();
    this.renderTasks();
    this.updateStats();
    this.resetForm();
    this.toggleTaskCreator(false);
  }

  handleQuickDate(e) {
    const action = e.currentTarget.getAttribute("data-quick");
    const today = new Date();

    switch (action) {
      case "today":
        this.dom.todoDue.value = today.toISOString().split("T")[0];
        break;
      case "tomorrow": {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        this.dom.todoDue.value = d.toISOString().split("T")[0];
        break;
      }
      case "weekend": {
        const dow = today.getDay();
        const sat = new Date(today);
        sat.setDate(sat.getDate() + (dow === 0 ? 6 : 6 - dow));
        this.dom.todoDue.value = sat.toISOString().split("T")[0];
        break;
      }
      default:
        this.dom.todoDue.value = "";
    }

    e.currentTarget.style.transform = "scale(0.95)";
    setTimeout(() => {
      e.currentTarget.style.transform = "";
    }, 150);
  }

  handlePrioritySelect(e) {
    this.setPriority(e.currentTarget.getAttribute("data-priority"));
  }
  handleCategorySelect(e) {
    this.setCategory(e.currentTarget.getAttribute("data-category"));
  }

  handleFilterClick(e) {
    document
      .querySelectorAll(".filter-chip")
      .forEach((c) => c.classList.remove("active"));
    e.currentTarget.classList.add("active");
    this.setFilter(e.currentTarget.getAttribute("data-filter"));
  }

  setPriority(priority) {
    document
      .querySelectorAll(".priority-option")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelector(`.priority-option[data-priority="${priority}"]`)
      ?.classList.add("active");
    this.dom.todoPriority.value = priority;
  }

  setCategory(category) {
    document
      .querySelectorAll(".category-option")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelector(`.category-option[data-category="${category}"]`)
      ?.classList.add("active");
    this.dom.todoTag.value = category;
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this.renderTasks();
  }

  toggleTaskCreator(show) {
    const { taskCreator, btnNewTask, todoText } = this.dom;
    if (show) {
      taskCreator.classList.add("active");
      btnNewTask.style.display = "none";
      setTimeout(() => todoText.focus(), 100);
    } else {
      taskCreator.classList.remove("active");
      btnNewTask.style.display = "flex";
      this.resetForm();
    }
  }

  toggleSidebar() {
    this.dom.sidebar.classList.toggle("active");
    this.dom.sidebarOverlay.classList.toggle("active");
  }

  closeSidebar() {
    this.dom.sidebar.classList.remove("active");
    this.dom.sidebarOverlay.classList.remove("active");
  }

  closeTaskDetail() {
    this.dom.taskDetail.classList.remove("active");
  }

  resetForm() {
    this.dom.todoForm.reset();
    this.dom.todoText.value = "";
    this.dom.todoDue.value = "";
    this.setPriority("med");
    this.setCategory("work");
    this.editingTaskId = null;
    this.dom.submitBtnText.textContent = "Add Task";
  }

  editTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.editingTaskId = taskId;
    this.dom.todoText.value = task.title;
    this.dom.todoDue.value = task.dueDate || "";
    this.setPriority(task.priority);
    this.setCategory(task.category);
    this.dom.submitBtnText.textContent = "Update Task";

    this.toggleTaskCreator(true);
    this.closeTaskDetail();
  }

  toggleTaskComplete(taskId) {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;

    this.tasks[idx].completed = !this.tasks[idx].completed;

    if (this.timers[taskId]) this.stopTimer(taskId);

    this.saveTasks();
    this.renderTasks();
    this.updateStats();
    this.showTaskDetail(taskId);

    this.showToast(
      `Task ${this.tasks[idx].completed ? "completed" : "marked active"}`,
      "success",
    );
  }

  deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    this.tasks = this.tasks.filter((t) => t.id !== taskId);

    if (this.timers[taskId]) {
      this.stopTimer(taskId);
      delete this.timers[taskId];
    }

    this.saveTasks();
    this.renderTasks();
    this.updateStats();
    this.closeTaskDetail();
    this.dom.detailContent.innerHTML = "";

    this.showToast("Task deleted", "danger");
  }

  clearCompletedTasks() {
    const completedCount = this.tasks.filter((t) => t.completed).length;

    if (completedCount === 0) {
      this.showToast("No completed tasks to clear", "info");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to clear ${completedCount} completed task(s)?`,
      )
    )
      return;

    // Close detail panel if it's showing a completed task
    if (this.dom.taskDetail.classList.contains("active")) {
      const titleEl = this.dom.taskDetail.querySelector(
        ".detail-header-row h4",
      );
      if (titleEl) {
        const openTitle = titleEl.textContent.trim();
        const isCompleted = this.tasks.some(
          (t) => t.completed && this.escapeHtml(t.title) === openTitle,
        );
        if (isCompleted) {
          this.closeTaskDetail();
          this.dom.detailContent.innerHTML = "";
        }
      }
    }

    this.tasks = this.tasks.filter((t) => !t.completed);
    this.saveTasks();
    this.renderTasks();
    this.updateStats();

    this.showToast(`${completedCount} completed task(s) cleared`, "success");
  }

  getFilteredTasks() {
    const searchTerm = this.dom.searchInput.value.toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    let filtered = this.tasks.filter((task) => {
      // Search
      if (
        searchTerm &&
        !task.title.toLowerCase().includes(searchTerm) &&
        !task.category.toLowerCase().includes(searchTerm)
      )
        return false;

      // Status / category filters
      switch (this.currentFilter) {
        case "active":
          return !task.completed;
        case "done":
          return task.completed;
        case "today":
          return task.dueDate === today;
        case "high":
          return task.priority === "high";
        case "no-date":
          return !task.dueDate;
        case "overdue":
          return (
            task.dueDate && !task.completed && new Date(task.dueDate) < now
          );
        case "upcoming": {
          if (!task.dueDate || task.completed) return false;
          const due = new Date(task.dueDate);
          const nextWk = new Date(now);
          nextWk.setDate(nextWk.getDate() + 7);
          return due > now && due <= nextWk;
        }
        case "work":
        case "personal":
        case "health":
        case "learning":
          return task.category === this.currentFilter;
        default:
          return true; // "all"
      }
    });

    this.sortTasks(filtered);
    return filtered;
  }

  sortTasks(tasks) {
    switch (this.currentSort) {
      case "due":
        tasks.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        break;
      case "priority":
        tasks.sort(
          (a, b) =>
            this.PRIORITY_ORDER[b.priority] - this.PRIORITY_ORDER[a.priority],
        );
        break;
      case "created":
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "alphabetical":
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // manual
        tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  }

  renderTasks() {
    const { taskList, emptyState } = this.dom;
    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      taskList.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    taskList.innerHTML = filteredTasks
      .map((task) => this.createTaskElement(task))
      .join("");
    this.attachTaskEventListeners();
  }

  createTaskElement(task) {
    const isOverdue =
      task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
    const dueDateText = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "No due date";

    // Use cached lookup maps instead of inline object literals
    const priorityLabel = this.PRIORITY_LABELS[task.priority];
    const categoryLabel = this.CATEGORY_LABELS[task.category] || task.category;
    const safeTitle = this.escapeHtml(task.title);
    const id = task.id;

    return `
      <li class="task-item ${task.completed ? "done" : ""}" data-id="${id}" draggable="true">
        <div class="task-checkbox ${task.completed ? "checked" : ""}" onclick="app.toggleTaskComplete('${id}')">
          ${task.completed ? '<i class="fas fa-check"></i>' : ""}
        </div>
        <div class="task-content" onclick="app.showTaskDetail('${id}')">
          <div class="task-title">${safeTitle}</div>
          <div class="task-meta">
            <span class="task-priority ${task.priority}">${priorityLabel}</span>
            <span class="task-date ${isOverdue ? "overdue" : ""}">
              <i class="far fa-calendar"></i>
              ${dueDateText} ${isOverdue ? "(Overdue)" : ""}
            </span>
            <span class="task-category">${categoryLabel}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn edit"   onclick="app.editTask('${id}')"   title="Edit task"><i class="fas fa-edit"></i></button>
          <button class="task-action-btn delete" onclick="app.deleteTask('${id}')" title="Delete task"><i class="fas fa-trash-alt"></i></button>
        </div>
      </li>`;
  }

  attachTaskEventListeners() {
    document.querySelectorAll(".task-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        this.draggedItem = e.currentTarget;
        e.currentTarget.classList.add("dragging");
      });
      item.addEventListener("dragend", (e) => {
        e.currentTarget.classList.remove("dragging");
        this.draggedItem = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        const after = this.getDragAfterElement(this.dom.taskList, e.clientY);
        if (after == null) {
          this.dom.taskList.appendChild(this.draggedItem);
        } else {
          this.dom.taskList.insertBefore(this.draggedItem, after);
        }
      });
    });
  }

  getDragAfterElement(container, y) {
    return [...container.querySelectorAll(".task-item:not(.dragging)")].reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        return offset < 0 && offset > closest.offset
          ? { offset, element: child }
          : closest;
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;
  }

  setupDragAndDrop() {
    this.dom.taskList.addEventListener("dragover", (e) => e.preventDefault());
    this.dom.taskList.addEventListener("drop", (e) => {
      e.preventDefault();
      if (this.draggedItem) {
        this.updateTaskOrder();
        this.showToast("Task order updated", "success");
      }
    });
  }

  updateTaskOrder() {
    this.dom.taskList.querySelectorAll(".task-item").forEach((el, index) => {
      const idx = this.tasks.findIndex(
        (t) => t.id === el.getAttribute("data-id"),
      );
      if (idx !== -1) this.tasks[idx].order = index;
    });
    this.saveTasks();
  }

  showTaskDetail(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isOverdue =
      task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
    const priorityColor = this.PRIORITY_COLORS[task.priority];
    const priorityLabel = this.PRIORITY_LABELS[task.priority];
    const categoryLabel = this.CATEGORY_LABELS[task.category] || task.category;
    const timeSpent = this.formatTime(task.timeSpent || 0);
    const isTimerRunning = this.timers[taskId]?.running;
    const id = task.id;

    this.dom.detailContent.innerHTML = `
      <div class="task-detail-view">
        <div class="detail-header-row">
          <h4>${this.escapeHtml(task.title)}</h4>
          <span class="task-status ${task.completed ? "completed" : "active"}">
            ${task.completed ? "Completed" : "Active"}
          </span>
        </div>
        
        <div class="detail-section">
          <h5><i class="fas fa-info-circle"></i> Details</h5>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Priority:</span>
              <span class="detail-value priority-badge" style="background:${priorityColor}20;color:${priorityColor}">
                <span class="priority-dot" style="background:${priorityColor}"></span>
                ${priorityLabel}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${categoryLabel}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value ${isOverdue ? "overdue" : ""}">
                ${
                  task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Not set"
                }
                ${isOverdue ? '<span class="overdue-badge">Overdue</span>' : ""}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Created:</span>
              <span class="detail-value">
                ${new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h5><i class="fas fa-cog"></i> Actions</h5>
          <div class="action-buttons">
            <button class="btn-action" onclick="app.toggleTaskComplete('${id}')">
              <i class="fas ${task.completed ? "fa-undo" : "fa-check"}"></i>
              ${task.completed ? "Mark as Active" : "Mark Complete"}
            </button>
            <button class="btn-action" onclick="app.editTask('${id}')">
              <i class="fas fa-edit"></i> Edit Task
            </button>
            <button class="btn-action delete" onclick="app.deleteTask('${id}')">
              <i class="fas fa-trash-alt"></i> Delete Task
            </button>
          </div>
        </div>
        
        <div class="detail-section">
          <h5><i class="far fa-clock"></i> Time Tracking</h5>
          <div class="time-tracking">
            <div class="time-display">
              <span class="time-label">Time Spent:</span>
              <span class="time-value" id="time-${id}">${timeSpent}</span>
            </div>
            <div class="time-controls">
              <button class="btn-time ${isTimerRunning ? "active" : ""}"
                      onclick="app.${isTimerRunning ? "stopTimer" : "startTimer"}('${id}')"
                      id="timer-btn-${id}">
                <i class="fas ${isTimerRunning ? "fa-pause" : "fa-play"}"></i>
                ${isTimerRunning ? "Pause" : "Start"} Timer
              </button>
              <button class="btn-time" onclick="app.resetTimer('${id}')" ${task.timeSpent ? "" : "disabled"}>
                <i class="fas fa-redo"></i> Reset
              </button>
            </div>
          </div>
        </div>
      </div>`;

    this.dom.taskDetail.classList.add("active");
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  startTimer(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || this.timers[taskId]?.running) return;

    // ── Drift-resistant timer: track wall-clock start time ────────────────
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    const baseTime = task.timeSpent || 0;
    const startedAt = Date.now();

    this.timers[taskId] = {
      running: true,
      interval: setInterval(() => {
        // Calculate elapsed seconds from wall clock to prevent drift
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        this.tasks[taskIndex].timeSpent = baseTime + elapsed;
        this.saveTasks();

        const timeDisplay = document.getElementById(`time-${taskId}`);
        if (timeDisplay) {
          timeDisplay.textContent = this.formatTime(
            this.tasks[taskIndex].timeSpent,
          );
        }
      }, 1000),
    };

    const btn = document.getElementById(`timer-btn-${taskId}`);
    if (btn) {
      btn.innerHTML = '<i class="fas fa-pause"></i> Pause Timer';
      btn.classList.add("active");
      btn.setAttribute("onclick", `app.stopTimer('${taskId}')`);
      btn.nextElementSibling && (btn.nextElementSibling.disabled = false);
    }

    this.showToast("Timer started", "success");
  }

  stopTimer(taskId) {
    if (!this.timers[taskId]?.running) return;

    clearInterval(this.timers[taskId].interval);
    this.timers[taskId].running = false;

    const btn = document.getElementById(`timer-btn-${taskId}`);
    if (btn) {
      btn.innerHTML = '<i class="fas fa-play"></i> Start Timer';
      btn.classList.remove("active");
      btn.setAttribute("onclick", `app.startTimer('${taskId}')`);
    }

    this.showToast("Timer paused", "info");
  }

  resetTimer(taskId) {
    if (!confirm("Are you sure you want to reset the timer for this task?"))
      return;

    if (this.timers[taskId]) this.stopTimer(taskId);

    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      this.tasks[idx].timeSpent = 0;
      this.saveTasks();

      const timeDisplay = document.getElementById(`time-${taskId}`);
      if (timeDisplay) timeDisplay.textContent = this.formatTime(0);

      const btn = document.getElementById(`timer-btn-${taskId}`);
      if (btn?.nextElementSibling) btn.nextElementSibling.disabled = true;
    }

    this.showToast("Timer reset", "success");
  }

  updateStats() {
    const tasks = this.tasks;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const todayCount = tasks.filter(
      (t) => t.dueDate === today && !t.completed,
    ).length;
    const upcomingCount = tasks.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      const d = new Date(t.dueDate);
      return d > now && d <= nextWeek;
    }).length;
    const overdueCount = tasks.filter(
      (t) => t.dueDate && !t.completed && new Date(t.dueDate) < now,
    ).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Single consolidated DOM write block
    const s = this.dom;
    s.countTotal.textContent = total;
    s.countActive.textContent = active;
    s.countDone.textContent = completed;
    s.countToday.textContent = todayCount;
    s.countUpcoming.textContent = upcomingCount;
    s.activeTaskCount.textContent = active;
    s.todayCount.textContent = todayCount;
    s.overdueCount.textContent = overdueCount;
    s.completionRate.textContent = `${rate}%`;
    s.completedTasksCount.textContent = completed;
  }

  saveTasks() {
    localStorage.setItem("vividTasks", JSON.stringify(this.tasks));
  }

  showToast(message, type = "info") {
    const toastId = `toast-${Date.now()}`;
    const icon = this.TOAST_ICONS[type] || "fa-info-circle";

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas ${icon}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
        <i class="fas fa-times"></i>
      </button>`;

    this.dom.toastHost.appendChild(toast);
    setTimeout(() => document.getElementById(toastId)?.remove(), 5000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new VividTasks();
  window.app = app; // expose AFTER init so inline handlers always have a valid reference
  app.dom.popupOverlay.classList.add("active");
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
});
