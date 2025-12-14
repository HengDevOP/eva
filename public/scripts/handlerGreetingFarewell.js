function setupMessageHandler(type, guildId) {
  const enableToggle = document.getElementById(`${type}-enabled`);
  const settings = document.getElementById(`${type}-settings`);
  const useEmbedToggle = document.getElementById(`${type}-use-embed`);
  const embedInputs = document.getElementById(`${type}-embed-inputs`);
  const previewBtn = document.getElementById(`preview-${type}`);
  const previewBox = document.getElementById(`${type}-preview`);
  const saveBtn = document.getElementById(`save-${type}`);

  if (!enableToggle || !settings || !previewBtn || !saveBtn) return; // Skip if missing

  // Toggle settings visibility
  enableToggle.addEventListener("change", () => {
    settings.classList.toggle("hidden", !enableToggle.checked);
  });

  // Toggle embed inputs if exists
  if (useEmbedToggle && embedInputs) {
    useEmbedToggle.addEventListener("change", () => {
      embedInputs.classList.toggle("hidden", !useEmbedToggle.checked);
    });
  }

  // Preview
  previewBtn.addEventListener("click", () => {
    if (!previewBox) return;
    previewBox.innerHTML = "";

    if (useEmbedToggle && useEmbedToggle.checked) {
      const titleInput = document.getElementById(`${type}-embed-title`);
      const descInput = document.getElementById(`${type}-embed-description`);
      const footerInput = document.getElementById(`${type}-embed-footer`);
      const colorInput = document.getElementById(`${type}-embed-color`);

      const title = titleInput ? titleInput.value : "";
      const description = descInput ? descInput.value : "";
      const footer = footerInput ? footerInput.value : "";
      const color = colorInput ? colorInput.value : "#ffffff";

      previewBox.innerHTML = `
        <div style="border-left: 5px solid ${color}; padding-left: 10px;">
          <h3 class="font-bold text-lg">${title || "No Title"}</h3>
          <p>${description || "No Description"}</p>
          <small class="opacity-70">${footer || ""}</small>
        </div>
      `;
    } else {
      const messageInput = document.getElementById(`${type}-description`);
      previewBox.textContent = messageInput ? messageInput.value : "No Message";
    }
    previewBox.classList.remove("hidden");
  });

  // Save
  saveBtn.addEventListener("click", async () => {
    const messageInput = document.getElementById(`${type}-description`);
    const channelInput = document.getElementById(`${type}-channel`);

    const payload = {
      enabled: enableToggle.checked,
      useEmbed: useEmbedToggle ? useEmbedToggle.checked : false,
      message: messageInput ? messageInput.value : "",
      embed:
        useEmbedToggle && useEmbedToggle.checked
          ? {
              title:
                document.getElementById(`${type}-embed-title`)?.value || "",
              description:
                document.getElementById(`${type}-embed-description`)?.value ||
                "",
              footer:
                document.getElementById(`${type}-embed-footer`)?.value || "",
              color:
                document.getElementById(`${type}-embed-color`)?.value ||
                "#ffffff",
            }
          : null,
      channel: channelInput ? channelInput.value : null,
    };

    try {
      const res = await fetch(`/dashboard/${guildId}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      alert(data.success ? `${type} saved!` : `Failed to save ${type}`);
    } catch (err) {
      console.error(`Error saving ${type}:`, err);
      alert("Something went wrong!");
    }
  });
}

// Initialize Greeting and Farewell
document.addEventListener("DOMContentLoaded", () => {
  const guildId = "<%= guildId %>"; // from EJS
  setupMessageHandler("greeting", guildId);
  setupMessageHandler("farewell", guildId);
});
