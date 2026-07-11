import React from "react";

export class MockForecastControls extends React.PureComponent<{
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onYearsChange: (years: number) => void;
  yearsAhead: number;
}> {
  private readonly handleToggle = () => {
    this.props.onToggle(!this.props.enabled);
  };

  private readonly handleYearsChange = (
    event_: React.ChangeEvent<HTMLInputElement>,
  ) => {
    this.props.onYearsChange(Number(event_.target.value));
  };

  public render(): React.ReactNode {
    const { enabled, yearsAhead } = this.props;

    return (
      <div data-testid="forecast-controls">
        <button
          data-testid="forecast-toggle"
          onClick={this.handleToggle}
          type="button"
        >
          {enabled ? "Disable" : "Enable"} Forecast
        </button>
        <input
          aria-label="Forecast years"
          data-testid="forecast-years"
          onChange={this.handleYearsChange}
          type="number"
          value={yearsAhead}
        />
      </div>
    );
  }
}

export class MockSelectControl extends React.PureComponent<{
  data: Array<{ label: string; value: string }>;
  getTestId?: (label?: string) => string;
  label?: string;
  onChange?: (value: string) => void;
  value?: string;
}> {
  private readonly handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    this.props.onChange?.(event.target.value);
  };

  public render(): React.ReactNode {
    const { data, getTestId, label, value } = this.props;
    const testId = getTestId?.(label) ?? "select";

    return (
      <div>
        {label && <label>{label}</label>}
        <select data-testid={testId} onChange={this.handleChange} value={value}>
          {data.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
}
