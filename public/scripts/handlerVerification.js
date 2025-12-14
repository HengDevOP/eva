document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("verification-toggle");
  const roleSelection = document.getElementById("role-selection-container");
  const saveBtn = document.getElementById("save-verification");
  const saveText = document.getElementById("save-text");
  const saveSpinner = document.getElementById("save-spinner");
  const toast = document.getElementById("save-status-toast");

  // ✅ Toggle role selection visibility
  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      roleSelection.classList.remove("hidden");
    } else {
      roleSelection.classList.add("hidden");
    }
  });

  // ✅ Role add/remove
  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const roleName = btn.dataset.roleName;
      const container = document.getElementById("selected-roles-container");

      // If already selected → remove
      const existing = container.querySelector(
        `[data-role-name="${roleName}"]`
      );
      if (existing) {
        existing.remove();
        return;
      }

      // Otherwise add new pill
      const span = document.createElement("span");
      span.className =
        "bg-blue-500 text-white px-3 py-1 rounded-full flex items-center gap-2";
      span.dataset.roleName = roleName;

      const text = document.createElement("span");
      text.textContent = roleName;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "ml-1 font-bold";
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", () => span.remove());

      span.appendChild(text);
      span.appendChild(removeBtn);
      container.appendChild(span);
    });
  });

  // ✅ Save handler
  saveBtn.addEventListener("click", async () => {
    const guildId = window.location.pathname.split("/")[2]; // /dashboard/:guildId/verification
    const isEnable = toggle.checked;
    const roles = Array.from(
      document.querySelectorAll("#selected-roles-container [data-role-name]")
    ).map((el) => el.dataset.roleName);

    // Show spinner
    saveBtn.disabled = true;
    saveText.textContent = "Saving...";
    saveSpinner.classList.remove("hidden");

    try {
      const res = await fetch(`/dashboard/${guildId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnable, roles }),
      });

      const data = await res.json();
      showToast(data.success ? "✅ Saved successfully" : "❌ " + data.message);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to save settings");
    } finally {
      // Reset button
      saveBtn.disabled = false;
      saveText.textContent = "Save Changes";
      saveSpinner.classList.add("hidden");
    }
  });

  // ✅ Floating toast
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("opacity-0", "-translate-y-20");
    toast.classList.add("opacity-100", "translate-y-0");

    setTimeout(() => {
      toast.classList.add("opacity-0", "-translate-y-20");
      toast.classList.remove("opacity-100", "translate-y-0");
    }, 2500);
  }
});
