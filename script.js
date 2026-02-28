// app.js - Complete Vivid Tasks Application with Full Functionality

class VividTasks {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem("vividTasks")) || [];
    this.currentFilter = "all";
    this.currentSort = "manual";
    this.editingTaskId = null;
    this.draggedItem = null;
    this.timers = {};

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderTasks();
    this.updateStats();
    this.setupDragAndDrop();
  }

  setupEventListeners() {
    // Task Form
    const form = document.getElementById("todoForm");
    form.addEventListener("submit", (e) => this.handleFormSubmit(e));

    // Quick date buttons
    document.querySelectorAll(".quick-action").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleQuickDate(e));
    });

    // Priority selector
    document.querySelectorAll(".priority-option").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handlePrioritySelect(e));
    });

    // Category selector
    document.querySelectorAll(".category-option").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleCategorySelect(e));
    });

    // New task button
    document.getElementById("btnNewTask").addEventListener("click", () => {
      this.toggleTaskCreator(true);
    });

    // Close task creator
    document.getElementById("btnCloseCreator").addEventListener("click", () => {
      this.toggleTaskCreator(false);
    });

    document.getElementById("btnCancelTask").addEventListener("click", () => {
      this.toggleTaskCreator(false);
    });

    // Empty state new task button
    const emptyBtn = document.getElementById("btnEmptyNewTask");
    if (emptyBtn) {
      emptyBtn.addEventListener("click", () => {
        this.toggleTaskCreator(true);
      });
    }

    // Filter chips
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => this.handleFilterClick(e));
    });

    // Sidebar navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const filter = e.currentTarget.getAttribute("data-filter") || "all";
        this.setFilter(filter);

        // Update active state
        document
          .querySelectorAll(".nav-item")
          .forEach((nav) => nav.classList.remove("active"));
        e.currentTarget.classList.add("active");

        // Close sidebar on mobile
        this.closeSidebar();
      });
    });

    // Sort control
    document.getElementById("sortBy").addEventListener("change", (e) => {
      this.currentSort = e.target.value;
      this.renderTasks();
    });

    // Search
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", (e) => {
      this.renderTasks();
    });

    // Search toggle (mobile)
    document.getElementById("btnSearchToggle").addEventListener("click", () => {
      const searchContainer = document.getElementById("searchContainer");
      searchContainer.classList.toggle("active");
      if (searchContainer.classList.contains("active")) {
        searchInput.focus();
      }
    });

    // Clear done button
    document.getElementById("btnClearDone").addEventListener("click", () => {
      this.clearCompletedTasks();
    });

    // Clear search button
    document.getElementById("btnClearSearch").addEventListener("click", () => {
      searchInput.value = "";
      this.renderTasks();
    });

    // Menu toggle (mobile)
    document.getElementById("menuToggle").addEventListener("click", () => {
      this.toggleSidebar();
    });

    // Sidebar overlay (mobile)
    document.getElementById("sidebarOverlay").addEventListener("click", () => {
      this.closeSidebar();
    });

    // Toggle task detail close
    document.getElementById("btnCloseDetail").addEventListener("click", () => {
      this.closeTaskDetail();
    });

    // Notifications button
    document
      .getElementById("btnNotifications")
      .addEventListener("click", () => {
        document.getElementById("popupOverlay").classList.add("active");
      });

    document.getElementById("closePopupBtn").addEventListener("click", () => {
      document.getElementById("popupOverlay").classList.remove("active");
    });

    document.getElementById("popupOverlay").addEventListener("click", (e) => {
      if (e.target === document.getElementById("popupOverlay")) {
        document.getElementById("popupOverlay").classList.remove("active");
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // N key for new task
      if (
        e.key === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        this.toggleTaskCreator(true);
      }

      // Escape key to close panels
      if (e.key === "Escape") {
        this.toggleTaskCreator(false);
        this.closeTaskDetail();
        this.closeSidebar();
        document.getElementById("popupOverlay").classList.remove("active");
      }
    });

    // Initialize default selections
    this.setPriority("med");
    this.setCategory("work");
  }

  handleFormSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById("todoText");
    const dueDateInput = document.getElementById("todoDue");
    const priorityInput = document.getElementById("todoPriority");
    const categoryInput = document.getElementById("todoTag");

    if (!titleInput.value.trim()) {
      this.showToast("Please enter a task title", "warning");
      return;
    }

    const taskData = {
      id: this.editingTaskId || Date.now().toString(),
      title: titleInput.value.trim(),
      dueDate: dueDateInput.value || null,
      priority: priorityInput.value,
      category: categoryInput.value || "work",
      completed: false,
      createdAt: new Date().toISOString(),
      order: this.tasks.length,
      timeSpent: 0,
    };

    if (this.editingTaskId) {
      // Update existing task
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
      document.getElementById("submitBtnText").textContent = "Add Task";
    } else {
      // Add new task
      this.tasks.push(taskData);
      this.showToast("Task added successfully", "success");
    }

    // Save and update UI
    this.saveTasks();
    this.renderTasks();
    this.updateStats();
    this.resetForm();
    this.toggleTaskCreator(false);
  }

  handleQuickDate(e) {
    const action = e.currentTarget.getAttribute("data-quick");
    const dateInput = document.getElementById("todoDue");
    const today = new Date();

    switch (action) {
      case "today":
        dateInput.value = today.toISOString().split("T")[0];
        break;
      case "tomorrow":
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split("T")[0];
        break;
      case "weekend":
        const dayOfWeek = today.getDay();
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
        const saturday = new Date(today);
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        dateInput.value = saturday.toISOString().split("T")[0];
        break;
      default:
        dateInput.value = "";
    }

    // Visual feedback
    e.currentTarget.style.transform = "scale(0.95)";
    setTimeout(() => {
      e.currentTarget.style.transform = "";
    }, 150);
  }

  handlePrioritySelect(e) {
    const priority = e.currentTarget.getAttribute("data-priority");
    this.setPriority(priority);
  }

  handleCategorySelect(e) {
    const category = e.currentTarget.getAttribute("data-category");
    this.setCategory(category);
  }

  handleFilterClick(e) {
    const filter = e.currentTarget.getAttribute("data-filter");

    // Update active state
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.remove("active");
    });
    e.currentTarget.classList.add("active");

    this.setFilter(filter);
  }

  setPriority(priority) {
    document.querySelectorAll(".priority-option").forEach((btn) => {
      btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(
      `.priority-option[data-priority="${priority}"]`,
    );
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    document.getElementById("todoPriority").value = priority;
  }

  setCategory(category) {
    document.querySelectorAll(".category-option").forEach((btn) => {
      btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(
      `.category-option[data-category="${category}"]`,
    );
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    document.getElementById("todoTag").value = category;
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this.renderTasks();
  }

  toggleTaskCreator(show) {
    const creator = document.querySelector(".task-creator");
    const newTaskBtn = document.getElementById("btnNewTask");

    if (show) {
      creator.classList.add("active");
      newTaskBtn.style.display = "none";
      setTimeout(() => {
        document.getElementById("todoText").focus();
      }, 100);
    } else {
      creator.classList.remove("active");
      newTaskBtn.style.display = "flex";
      this.resetForm();
    }
  }

  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
  }

  closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  }

  closeTaskDetail() {
    document.querySelector(".task-detail").classList.remove("active");
  }

  resetForm() {
    document.getElementById("todoForm").reset();
    document.getElementById("todoText").value = "";
    document.getElementById("todoDue").value = "";
    this.setPriority("med");
    this.setCategory("work");
    this.editingTaskId = null;
    document.getElementById("submitBtnText").textContent = "Add Task";
  }

  editTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.editingTaskId = taskId;

    // Fill form with task data
    document.getElementById("todoText").value = task.title;
    document.getElementById("todoDue").value = task.dueDate || "";
    this.setPriority(task.priority);
    this.setCategory(task.category);
    document.getElementById("submitBtnText").textContent = "Update Task";

    // Show task creator
    this.toggleTaskCreator(true);

    // Close task detail on mobile
    this.closeTaskDetail();
  }

  toggleTaskComplete(taskId) {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    this.tasks[taskIndex].completed = !this.tasks[taskIndex].completed;

    // Stop timer if running
    if (this.timers[taskId]) {
      this.stopTimer(taskId);
    }

    this.saveTasks();
    this.renderTasks();
    this.updateStats();
    this.showTaskDetail(taskId);

    const action = this.tasks[taskIndex].completed
      ? "completed"
      : "marked active";
    this.showToast(`Task ${action}`, "success");
  }

  deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    this.tasks = this.tasks.filter((t) => t.id !== taskId);

    // Stop and clear timer if running
    if (this.timers[taskId]) {
      this.stopTimer(taskId);
      delete this.timers[taskId];
    }

    this.saveTasks();
    this.renderTasks();
    this.updateStats();
    this.closeTaskDetail();

    const detailContent = document.querySelector(".detail-content");
    detailContent.innerHTML = "";

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

    this.tasks = this.tasks.filter((t) => !t.completed);
    this.saveTasks();
    this.renderTasks();
    this.updateStats();

    this.showToast(`${completedCount} completed task(s) cleared`, "success");
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];

    // Apply search filter
    const searchTerm = document
      .getElementById("searchInput")
      .value.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm) ||
          task.category.toLowerCase().includes(searchTerm),
      );
    }

    // Apply status/category filter
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    switch (this.currentFilter) {
      case "active":
        filtered = filtered.filter((task) => !task.completed);
        break;
      case "done":
        filtered = filtered.filter((task) => task.completed);
        break;
      case "today":
        filtered = filtered.filter((task) => task.dueDate === today);
        break;
      case "upcoming":
        filtered = filtered.filter((task) => {
          if (!task.dueDate || task.completed) return false;
          const dueDate = new Date(task.dueDate);
          const nextWeek = new Date(now);
          nextWeek.setDate(nextWeek.getDate() + 7);
          return dueDate > now && dueDate <= nextWeek;
        });
        break;
      case "high":
        filtered = filtered.filter((task) => task.priority === "high");
        break;
      case "overdue":
        filtered = filtered.filter(
          (task) =>
            task.dueDate && !task.completed && new Date(task.dueDate) < now,
        );
        break;
      case "no-date":
        filtered = filtered.filter((task) => !task.dueDate);
        break;
      case "work":
      case "personal":
      case "health":
      case "learning":
        filtered = filtered.filter(
          (task) => task.category === this.currentFilter,
        );
        break;
      case "all":
      default:
        // Show all tasks
        break;
    }

    // Apply sorting
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
        const priorityOrder = { high: 3, med: 2, low: 1 };
        tasks.sort(
          (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority],
        );
        break;
      case "created":
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "alphabetical":
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "manual":
      default:
        tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        break;
    }
  }

  renderTasks() {
    const taskList = document.getElementById("todoList");
    const emptyState = document.getElementById("emptyState");
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

    // Add event listeners to dynamically created elements
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

    const priorityLabels = {
      high: "High",
      med: "Medium",
      low: "Low",
    };

    const categoryLabels = {
      work: "Work",
      personal: "Personal",
      health: "Health",
      learning: "Learning",
      other: "Other",
    };

    return `
      <li class="task-item ${task.completed ? "done" : ""}" data-id="${
        task.id
      }" draggable="true">
        <div class="task-checkbox ${
          task.completed ? "checked" : ""
        }" onclick="app.toggleTaskComplete('${task.id}')">
          ${task.completed ? '<i class="fas fa-check"></i>' : ""}
        </div>
        <div class="task-content" onclick="app.showTaskDetail('${task.id}')">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="task-priority ${task.priority}">${
              priorityLabels[task.priority]
            }</span>
            <span class="task-date ${isOverdue ? "overdue" : ""}">
              <i class="far fa-calendar"></i>
              ${dueDateText} ${isOverdue ? "(Overdue)" : ""}
            </span>
            <span class="task-category">${
              categoryLabels[task.category] || task.category
            }</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn edit" onclick="app.editTask('${
            task.id
          }')" title="Edit task">
            <i class="fas fa-edit"></i>
          </button>
          <button class="task-action-btn delete" onclick="app.deleteTask('${
            task.id
          }')" title="Delete task">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </li>
    `;
  }

  attachTaskEventListeners() {
    // Drag and drop events
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
        const afterElement = this.getDragAfterElement(
          document.getElementById("todoList"),
          e.clientY,
        );
        const container = document.getElementById("todoList");

        if (afterElement == null) {
          container.appendChild(this.draggedItem);
        } else {
          container.insertBefore(this.draggedItem, afterElement);
        }
      });
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".task-item:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;
  }

  setupDragAndDrop() {
    const taskList = document.getElementById("todoList");

    taskList.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    taskList.addEventListener("drop", (e) => {
      e.preventDefault();
      if (this.draggedItem) {
        this.updateTaskOrder();
        this.showToast("Task order updated", "success");
      }
    });
  }

  updateTaskOrder() {
    const taskElements = document.querySelectorAll(".task-item");
    taskElements.forEach((element, index) => {
      const taskId = element.getAttribute("data-id");
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex !== -1) {
        this.tasks[taskIndex].order = index;
      }
    });

    this.saveTasks();
  }

  showTaskDetail(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const detailContent = document.querySelector(".detail-content");
    const isOverdue =
      task.dueDate && !task.completed && new Date(task.dueDate) < new Date();

    const priorityLabels = { high: "High", med: "Medium", low: "Low" };
    const priorityColors = { high: "#ef4444", med: "#f59e0b", low: "#10b981" };
    const categoryLabels = {
      work: "Work",
      personal: "Personal",
      health: "Health",
      learning: "Learning",
      other: "Other",
    };

    const timeSpent = this.formatTime(task.timeSpent || 0);
    const isTimerRunning = this.timers[taskId] && this.timers[taskId].running;

    detailContent.innerHTML = `
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
              <span class="detail-value priority-badge" style="background: ${
                priorityColors[task.priority]
              }20; color: ${priorityColors[task.priority]}">
                <span class="priority-dot" style="background: ${
                  priorityColors[task.priority]
                }"></span>
                ${priorityLabels[task.priority]}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${
                categoryLabels[task.category] || task.category
              }</span>
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
                ${new Date(task.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h5><i class="fas fa-cog"></i> Actions</h5>
          <div class="action-buttons">
            <button class="btn-action" onclick="app.toggleTaskComplete('${
              task.id
            }')">
              <i class="fas ${task.completed ? "fa-undo" : "fa-check"}"></i>
              ${task.completed ? "Mark as Active" : "Mark Complete"}
            </button>
            <button class="btn-action" onclick="app.editTask('${task.id}')">
              <i class="fas fa-edit"></i>
              Edit Task
            </button>
            <button class="btn-action delete" onclick="app.deleteTask('${
              task.id
            }')">
              <i class="fas fa-trash-alt"></i>
              Delete Task
            </button>
          </div>
        </div>
        
        <div class="detail-section">
          <h5><i class="far fa-clock"></i> Time Tracking</h5>
          <div class="time-tracking">
            <div class="time-display">
              <span class="time-label">Time Spent:</span>
              <span class="time-value" id="time-${task.id}">${timeSpent}</span>
            </div>
            <div class="time-controls">
              <button class="btn-time ${
                isTimerRunning ? "active" : ""
              }" onclick="app.${isTimerRunning ? "stopTimer" : "startTimer"}('${
                task.id
              }')" id="timer-btn-${task.id}">
                <i class="fas ${isTimerRunning ? "fa-pause" : "fa-play"}"></i> 
                ${isTimerRunning ? "Pause" : "Start"} Timer
              </button>
              <button class="btn-time" onclick="app.resetTimer('${task.id}')" ${
                task.timeSpent ? "" : "disabled"
              }>
                <i class="fas fa-redo"></i> Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Show detail panel
    document.querySelector(".task-detail").classList.add("active");
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  startTimer(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (this.timers[taskId] && this.timers[taskId].running) {
      return;
    }

    this.timers[taskId] = {
      running: true,
      startTime: Date.now(),
      interval: setInterval(() => {
        const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex].timeSpent =
            (this.tasks[taskIndex].timeSpent || 0) + 1;
          this.saveTasks();

          // Update display if detail panel is open
          const timeDisplay = document.getElementById(`time-${taskId}`);
          if (timeDisplay) {
            timeDisplay.textContent = this.formatTime(
              this.tasks[taskIndex].timeSpent,
            );
          }
        }
      }, 1000),
    };

    // Update button
    const btn = document.getElementById(`timer-btn-${taskId}`);
    if (btn) {
      btn.innerHTML = '<i class="fas fa-pause"></i> Pause Timer';
      btn.classList.add("active");
      btn.setAttribute("onclick", `app.stopTimer('${taskId}')`);
    }

    // Enable reset button
    const resetBtn = document.querySelector(
      `#timer-btn-${taskId}`,
    ).nextElementSibling;
    if (resetBtn) {
      resetBtn.disabled = false;
    }

    this.showToast("Timer started", "success");
  }

  stopTimer(taskId) {
    if (!this.timers[taskId] || !this.timers[taskId].running) {
      return;
    }

    clearInterval(this.timers[taskId].interval);
    this.timers[taskId].running = false;

    // Update button
    const btn = document.getElementById(`timer-btn-${taskId}`);
    if (btn) {
      btn.innerHTML = '<i class="fas fa-play"></i> Start Timer';
      btn.classList.remove("active");
      btn.setAttribute("onclick", `app.startTimer('${taskId}')`);
    }

    this.showToast("Timer paused", "info");
  }

  resetTimer(taskId) {
    if (!confirm("Are you sure you want to reset the timer for this task?")) {
      return;
    }

    // Stop timer if running
    if (this.timers[taskId]) {
      this.stopTimer(taskId);
    }

    // Reset time
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      this.tasks[taskIndex].timeSpent = 0;
      this.saveTasks();

      // Update display
      const timeDisplay = document.getElementById(`time-${taskId}`);
      if (timeDisplay) {
        timeDisplay.textContent = this.formatTime(0);
      }

      // Disable reset button
      const resetBtn = document.querySelector(
        `#timer-btn-${taskId}`,
      ).nextElementSibling;
      if (resetBtn) {
        resetBtn.disabled = true;
      }
    }

    this.showToast("Timer reset", "success");
  }

  updateStats() {
    const totalTasks = this.tasks.length;
    const activeTasks = this.tasks.filter((t) => !t.completed).length;
    const completedTasks = this.tasks.filter((t) => t.completed).length;

    // Today's tasks
    const today = new Date().toISOString().split("T")[0];
    const todayTasks = this.tasks.filter(
      (t) => t.dueDate === today && !t.completed,
    ).length;

    // Upcoming tasks (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingTasks = this.tasks.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate > now && dueDate <= nextWeek;
    }).length;

    // Overdue tasks
    const overdueTasks = this.tasks.filter(
      (t) => t.dueDate && !t.completed && new Date(t.dueDate) < now,
    ).length;

    // Completion rate
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update DOM
    document.getElementById("countTotal").textContent = totalTasks;
    document.getElementById("countActive").textContent = activeTasks;
    document.getElementById("countDone").textContent = completedTasks;
    document.getElementById("countToday").textContent = todayTasks;
    document.getElementById("countUpcoming").textContent = upcomingTasks;
    document.getElementById("activeTaskCount").textContent = activeTasks;
    document.getElementById("todayCount").textContent = todayTasks;
    document.getElementById("overdueCount").textContent = overdueTasks;
    document.getElementById("completionRate").textContent =
      `${completionRate}%`;
    document.getElementById("completedTasksCount").textContent = completedTasks;
  }

  saveTasks() {
    localStorage.setItem("vividTasks", JSON.stringify(this.tasks));
  }

  showToast(message, type = "info") {
    const toastHost = document.getElementById("toastHost");
    const toastId = "toast-" + Date.now();

    const icons = {
      success: "fa-check-circle",
      warning: "fa-exclamation-triangle",
      danger: "fa-times-circle",
      info: "fa-info-circle",
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${icons[type] || "fa-info-circle"}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${
          type.charAt(0).toUpperCase() + type.slice(1)
        }</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    toastHost.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.getElementById(toastId)) {
        toast.remove();
      }
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when DOM is loaded
let app;

document.addEventListener("DOMContentLoaded", () => {
  app = new VividTasks();

  document.getElementById("popupOverlay").classList.add("active");
});

// Make app available globally for inline event handlers
window.app = app;
