(() => {
  "use strict";

  const numberFormat = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8
  });

  function parseNumber(input) {
    const raw = input.value.trim().replace(/\s/g, "");
    if (!raw) return null;
    const normalized = raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : NaN;
  }

  function formatted(value) {
    return numberFormat.format(value);
  }

  function bindConversion(inputId, resultId, factor, fromUnit, toUnit, divide = false) {
    const input = document.getElementById(inputId);
    const result = document.getElementById(resultId);
    if (!input || !result) return;

    const update = () => {
      const value = parseNumber(input);
      if (value === null) {
        result.textContent = "Digite um valor para converter.";
        return;
      }
      if (!Number.isFinite(value) || value < 0) {
        result.textContent = "Digite um número válido igual ou maior que zero.";
        return;
      }
      const converted = divide ? value / factor : value * factor;
      result.textContent = `${formatted(value)} ${fromUnit} = ${formatted(converted)} ${toUnit}`;
    };

    input.addEventListener("input", update);
  }

  bindConversion("poundsInput", "poundsResult", 0.45359237, "lb", "kg");
  bindConversion("milesInput", "milesResult", 1.609344, "mi", "km");
  bindConversion("kilometersInput", "kilometersResult", 1.609344, "km", "mi", true);
  bindConversion("metersInput", "metersResult", 100, "m", "cm");

  function bindForm(formId, inputIds, resultId, calculate) {
    const form = document.getElementById(formId);
    const result = document.getElementById(resultId);
    if (!form || !result) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const inputs = inputIds.map((id) => document.getElementById(id));
      const values = inputs.map(parseNumber);

      if (values.some((value) => value === null)) {
        result.textContent = "Preencha todos os valores para calcular.";
        return;
      }
      if (values.some((value) => !Number.isFinite(value))) {
        result.textContent = "Confira os números digitados e tente novamente.";
        return;
      }

      result.textContent = calculate(values);
    });
  }

  bindForm("ratioForm", ["ratioA", "ratioB", "ratioC"], "ratioResult", ([a, b, c]) => {
    if (a === 0) return "O valor A não pode ser zero.";
    return `X = ${formatted((b * c) / a)}`;
  });

  bindForm("percentForm", ["percentStart", "percentEnd"], "percentResult", ([start, end]) => {
    if (start === 0) return "O valor inicial precisa ser diferente de zero.";
    const change = ((end - start) / start) * 100;
    const direction = change > 0 ? "aumento" : change < 0 ? "redução" : "sem variação";
    return `${formatted(Math.abs(change))}% de ${direction}`;
  });
})();
