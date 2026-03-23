import React from "react";

const TimeSelector = ({
  timeValue,
  setTimeValue,
  timeUnit,
  setTimeUnit,
  count,
  setCount,
}) => {
  const units = ["seconds", "minutes", "hours", "days"];

  // Generate numbers based on unit
  const getNumbers = () => {
    switch (timeUnit) {
      case "seconds":
      case "minutes":
        return Array.from({ length: 60 }, (_, i) => i + 1);
      case "hours":
        return Array.from({ length: 24 }, (_, i) => i + 1);
      case "days":
        return Array.from({ length: 30 }, (_, i) => i + 1);
      default:
        return Array.from({ length: 60 }, (_, i) => i + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interval Value
        </label>
        <select
          value={timeValue}
          onChange={(e) => setTimeValue(e.target.value)}
          className="input-field"
        >
          {getNumbers().map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Unit
        </label>
        <select
          value={timeUnit}
          onChange={(e) => setTimeUnit(e.target.value)}
          className="input-field"
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit.charAt(0).toUpperCase() + unit.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Emails (Max 100)
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="input-field"
          placeholder="Count"
        />
      </div>
    </div>
  );
};

export default TimeSelector;
