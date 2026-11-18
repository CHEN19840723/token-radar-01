/* Download the complete radar board without changing the on-screen table. */
(function () {
  "use strict";

  var columns = [
    "rank",
    "name",
    "category",
    "chains",
    "tvl_usd",
    "change_7d",
    "mcap_usd",
    "implied_value_usd",
    "age_days",
    "token_status"
  ];

  function csvCell(value) {
    var text;
    if (value === null || value === undefined) {
      text = "";
    } else if (Array.isArray(value)) {
      text = value.join("|");
    } else {
      text = String(value);
    }
    if (/[",\r\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function boardRows() {
    if (!window.RADAR || !Array.isArray(window.RADAR.rows)) {
      return [];
    }
    return window.RADAR.rows;
  }

  function csvDocument(rows) {
    var lines = [columns.map(csvCell).join(",")];
    rows.forEach(function (row) {
      var values = columns.map(function (column) {
        return csvCell(row[column]);
      });
      lines.push(values.join(","));
    });
    /* A UTF-8 BOM makes the exported names open cleanly in spreadsheet apps. */
    return "\ufeff" + lines.join("\r\n") + "\r\n";
  }

  function downloadName(extension) {
    var date = window.RADAR && window.RADAR.as_of;
    var suffix = typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)
      ? date.slice(0, 10)
      : "current";
    return "token-radar-" + suffix + "." + extension;
  }

  function saveFile(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function exportCSV() {
    var rows = boardRows();
    saveFile(downloadName("csv"), csvDocument(rows), "text/csv;charset=utf-8");
  }

  function exportJSON() {
    var rows = boardRows();
    var content = JSON.stringify(rows, null, 2) + "\n";
    saveFile(downloadName("json"), content, "application/json;charset=utf-8");
  }

  function makeButton(label, handler) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "radar-export-button";
    button.addEventListener("click", handler);
    return button;
  }

  function elementSummary() {
    var summary = document.createElement("span");
    var count = boardRows().length;
    summary.className = "radar-export-summary";
    summary.textContent = "完整数据：" + count + " 行";
    summary.setAttribute("aria-live", "polite");
    summary.style.alignSelf = "center";
    return summary;
  }

  function install() {
    var board = document.getElementById("board");
    if (!board || document.getElementById("radar-export-controls")) {
      return;
    }
    var controls = document.createElement("div");
    controls.id = "radar-export-controls";
    controls.className = "radar-export-controls";
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.margin = "0 0 12px";
    controls.setAttribute("aria-label", "导出雷达数据");
    var summary = elementSummary();
    controls.appendChild(summary);
    controls.appendChild(makeButton("导出 CSV", exportCSV));
    controls.appendChild(makeButton("导出 JSON", exportJSON));
    board.insertBefore(controls, board.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
}());
