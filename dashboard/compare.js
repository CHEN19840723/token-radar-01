/* A small, dependency-free protocol comparison view. */
(function () {
  "use strict";

  var factorLabels = {
    liquidity: "流动性",
    momentum: "动量",
    valuation: "估值",
    distribution: "分布",
    risk: "风险"
  };

  function rows() {
    return window.RADAR && Array.isArray(window.RADAR.rows)
      ? window.RADAR.rows.slice()
      : [];
  }

  function byRank(a, b) {
    return Number(a.rank) - Number(b.rank);
  }

  function number(value) {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    var parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : "—";
  }

  function money(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "—";
    }
    return "$" + Number(value).toLocaleString("en-US", {
      maximumFractionDigits: 0
    });
  }

  function percent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "—";
    }
    return (Number(value) > 0 ? "+" : "") + Number(value) + "%";
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function cell(row, tag, text) {
    var node = element(tag, "", text);
    if (tag === "th") {
      node.scope = "col";
    }
    row.appendChild(node);
  }

  function factorEntries(protocols) {
    var keys = [];
    protocols.forEach(function (protocol) {
      if (!protocol || !protocol.model || typeof protocol.model !== "object") {
        return;
      }
      Object.keys(protocol.model).forEach(function (key) {
        if (typeof protocol.model[key] === "number" && keys.indexOf(key) < 0) {
          keys.push(key);
        }
      });
    });
    return keys;
  }

  function selectFor(protocols, index, onChange) {
    var select = document.createElement("select");
    select.setAttribute("aria-label", "对比协议 " + (index + 1));
    protocols.forEach(function (protocol) {
      var option = document.createElement("option");
      option.value = String(protocol.rank);
      option.textContent = protocol.rank + ". " + protocol.name;
      select.appendChild(option);
    });
    if (protocols[index]) {
      select.value = String(protocols[index].rank);
    }
    select.addEventListener("change", onChange);
    return select;
  }

  function selectedProtocols(protocols, selects) {
    return selects.map(function (select) {
      return protocols.find(function (protocol) {
        return String(protocol.rank) === select.value;
      });
    });
  }

  function renderTable(container, protocols, selects) {
    var chosen = selectedProtocols(protocols, selects);
    var keys = factorEntries(protocols);
    container.replaceChildren();
    var wrapper = element("div", "radar-compare-scroll");
    wrapper.style.overflowX = "auto";
    var table = element("table", "radar-compare-table");
    var head = table.createTHead().insertRow();
    cell(head, "th", "指标");
    chosen.forEach(function (protocol) {
      cell(head, "th", protocol ? protocol.name : "—");
    });
    var body = table.createTBody();
    function metric(label, value) {
      var line = body.insertRow();
      cell(line, "th", label);
      chosen.forEach(function (protocol) {
        cell(line, "td", protocol ? value(protocol) : "—");
      });
    }
    metric("协议名", function (p) { return p.name; });
    metric("类别", function (p) { return p.category || "—"; });
    metric("TVL", function (p) { return money(p.tvl_usd); });
    metric("7 天变化", function (p) { return percent(p.change_7d); });
    metric("市值", function (p) { return money(p.mcap_usd); });
    metric("隐含价值", function (p) { return money(p.implied_value_usd); });
    metric("年龄", function (p) { return number(p.age_days) + " 天"; });
    metric("链数", function (p) { return String((p.chains || []).length); });
    keys.forEach(function (key) {
      metric("模型因子 · " + (factorLabels[key] || key), function (p) {
        return p.model && typeof p.model[key] === "number" ? number(p.model[key]) : "—";
      });
    });
    metric("农耕步骤数", function (p) {
      return String(Array.isArray(p.farm_steps) ? p.farm_steps.length : 0);
    });
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  function renderLeaders(container, protocols) {
    container.replaceChildren();
    container.appendChild(element("h3", "", "7 天涨幅前 5"));
    var list = document.createElement("ol");
    protocols.slice().sort(function (a, b) {
      return Number(b.change_7d || 0) - Number(a.change_7d || 0);
    }).slice(0, 5).forEach(function (protocol) {
      var item = document.createElement("li");
      item.textContent = "#" + protocol.rank + " " + protocol.name + " " + percent(protocol.change_7d);
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  function install() {
    var board = document.getElementById("board");
    var protocols = rows().sort(byRank);
    if (!board || !protocols.length || document.getElementById("radar-compare")) {
      return;
    }
    var section = element("section", "radar-compare");
    section.id = "radar-compare";
    section.style.margin = "0 0 16px";
    section.appendChild(element("h2", "", "对比"));
    var picker = element("div", "radar-compare-picker");
    picker.style.display = "flex";
    picker.style.gap = "8px";
    picker.style.flexWrap = "wrap";
    var table = element("div", "radar-compare-result");
    var selects = [];
    function update() {
      renderTable(table, protocols, selects);
    }
    for (var index = 0; index < 3; index += 1) {
      var select = selectFor(protocols, index, update);
      selects.push(select);
      picker.appendChild(select);
    }
    var leaders = element("aside", "radar-gainers");
    section.appendChild(picker);
    section.appendChild(table);
    section.appendChild(leaders);
    board.insertBefore(section, board.firstChild);
    update();
    renderLeaders(leaders, protocols);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
}());
