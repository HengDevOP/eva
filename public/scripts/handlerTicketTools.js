// handlerTicketTools.js

document.addEventListener("DOMContentLoaded", () => {
  const guildId = "<%= guildId %>"; // passed from EJS

  // Elements
  const ticketEnabled = document.getElementById("ticket-enabled");
  const ticketLogging = document.getElementById("ticket-logging");
  const ticketCategories = {
    pending: document.getElementById("ticket-category-pending"),
    active: document.getElementById("ticket-category-active"),
    closed: document.getElementById("ticket-category-closed"),
  };
  const ticketRoles = document.getElementById("ticket-roles");
  const ticketMsgUser = document.getElementById("ticket-message-user");
  const ticketMsgStaff = document.getElementById("ticket-message-staff");
  const previewBtn = document.getElementById("preview-ticket");
  const previewBox = document.getElementById("ticket-preview");
  const saveBtn = document.getElementById("save-ticket");

  // Preview
  previewBtn.addEventListener("click", () => {
    previewBox.innerHTML = `
      <p><strong>Ticket System Enabled:</strong> ${ticketEnabled.checked}</p>
      <p><strong>Pending Category:</strong> ${
        ticketCategories.pending.value
      }</p>
      <p><strong>Active Category:</strong> ${ticketCategories.active.value}</p>
      <p><strong>Closed Category:</strong> ${ticketCategories.closed.value}</p>
      <p><strong>Assignable Roles:</strong> ${Array.from(
        ticketRoles.selectedOptions
      )
        .map((o) => o.text)
        .join(", ")}</p>
      <p><strong>Message to User:</strong> ${ticketMsgUser.value}</p>
      <p><strong>Message to Staff:</strong> ${ticketMsgStaff.value}</p>
      <p><strong>Logging Enabled:</strong> ${ticketLogging.checked}</p>
    `;
    previewBox.classList.remove("hidden");
  });

  // Save
  saveBtn.addEventListener("click", async () => {
    const payload = {
      enabled: ticketEnabled.checked,
      logging: ticketLogging.checked,
      categories: {
        pending: ticketCategories.pending.value,
        active: ticketCategories.active.value,
        closed: ticketCategories.closed.value,
      },
      roles: Array.from(ticketRoles.selectedOptions).map((o) => o.value),
      messages: {
        user: ticketMsgUser.value,
        staff: ticketMsgStaff.value,
      },
    };

    try {
      const res = await fetch(`/dashboard/${guildId}/ticket-tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      alert(
        data.success
          ? "Ticket settings saved!"
          : "Failed to save ticket settings"
      );
    } catch (err) {
      console.error("Error saving ticket settings:", err);
      alert("Something went wrong!");
    }
  });
});
