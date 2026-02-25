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
}

// Initialize the app when DOM is loaded
let app;

document.addEventListener("DOMContentLoaded", () => {
  app = new VividTasks();
});

document.getElementById("popupOverlay").classList.add("active");

// Make app available globally for inline event handlers
window.app = app;
