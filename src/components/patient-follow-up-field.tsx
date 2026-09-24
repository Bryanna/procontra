type PatientFollowUpStatus = "green" | "yellow" | "red" | "clinical";

const options = [
  { value: "green", label: "Verde", description: "Continuidad organizada" },
  { value: "yellow", label: "Amarillo", description: "Requiere seguimiento" },
  { value: "red", label: "Rojo", description: "Riesgo de interrupción" },
] as const;

export function PatientFollowUpField({ defaultValue = "green" }: { defaultValue?: PatientFollowUpStatus }) {
  const selectedValue = defaultValue === "clinical" ? "red" : defaultValue;

  return <fieldset className="patient-followup-field patient-field-wide">
    <legend>Estado de seguimiento</legend>
    <div className="patient-followup-options">
      {options.map((option) => <label className={`patient-followup-option patient-followup-${option.value}`} key={option.value}>
        <input
          aria-label={`${option.label} · ${option.description.toLocaleLowerCase("es-DO")}`}
          defaultChecked={selectedValue === option.value}
          name="followUpStatus"
          type="radio"
          value={option.value}
        />
        <i aria-hidden="true" />
        <span><strong>{option.label}</strong><small>{option.description}</small></span>
      </label>)}
    </div>
  </fieldset>;
}
