/** Export the complete laid-out table, including cells outside its scroll viewport. */
export async function downloadTableJpg(table: HTMLTableElement, filename: string) {
  await document.fonts.ready;
  const bounds = table.getBoundingClientRect();
  const padding = 20;
  const headingHeight = 40;
  const width = Math.ceil(bounds.width + padding * 2);
  const height = Math.ceil(bounds.height + padding * 2 + headingHeight);
  // Keep large exports within practical mobile canvas limits.
  const scale = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(16000000 / (width * height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear la imagen.");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#111";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("Resultado Galas", padding, padding);

  const offsetX = padding - bounds.left;
  const offsetY = padding + headingHeight - bounds.top;
  for (const row of Array.from(table.rows)) {
    for (const cell of Array.from(row.cells)) {
      const rect = cell.getBoundingClientRect();
      const style = getComputedStyle(cell);
      const x = rect.left + offsetX;
      const y = rect.top + offsetY;
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(x, y, rect.width, rect.height);
      if (style.borderTopStyle !== "none" || style.borderBottomStyle !== "none") {
        ctx.strokeStyle = "#b8bec5";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, rect.width, rect.height);
      }

      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim() || !node.parentElement) continue;
        const textStyle = getComputedStyle(node.parentElement);
        const range = document.createRange();
        range.selectNodeContents(node);
        const textRect = range.getBoundingClientRect();
        if (!textRect.width || !textRect.height) continue;
        ctx.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
        ctx.fillStyle = "#111";
        ctx.textBaseline = "alphabetic";
        const metrics = ctx.measureText(node.textContent);
        const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(textStyle.fontSize) * 0.8;
        const descent = metrics.fontBoundingBoxDescent ?? parseFloat(textStyle.fontSize) * 0.2;
        ctx.fillText(node.textContent, textRect.left + offsetX,
          textRect.top + offsetY + (textRect.height - ascent - descent) / 2 + ascent);
      }
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error("No se pudo generar el JPG.")), "image/jpeg", 0.95);
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow mobile browsers time to consume the download URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
