import React, { useState } from 'react';
import CurrencyInput from '../index';

export const Example5 = () => {
  const [rawValue, setRawValue] = useState<string | undefined>(' ');

  const handleValueChange = (value: string | undefined): void => {
    const rawValue = value === undefined ? 'undefined' : value;
    setRawValue(rawValue || ' ');
  };

  return (
    <div className="row">
      <div className="col-12 mb-4">
        <a
          href="https://github.com/cchanxzy/react-currency-input-field/blob/main/src/examples/Example5.tsx"
          target="_blank"
          rel="noreferrer"
        >
          <h2>Example 5</h2>
        </a>
        <ul>
          <li>No prefix or suffix</li>
          <li>No group separators (no formatting while typing)</li>
          <li>Allows decimals (up to 2 decimal places)</li>
          <li>Supports math expression evaluation</li>
        </ul>
        <form className="needs-validation">
          <div className="row">
            <div className="col">
              <label htmlFor="validation-example-5-field">Please enter a value:</label>
              <CurrencyInput
                id="validation-example-5-field"
                placeholder="1234567.89"
                allowDecimals={true}
                decimalsLimit={2}
                disableGroupSeparators={true}
                className="form-control"
                onValueChange={handleValueChange}
              />
            </div>
            <div className="form-group col">
              <pre className="h-100 p-3 bg-dark text-white">
                <div className="row">
                  <div className="col-6">
                    <div className="text-muted mr-3">onValueChange:</div>
                    {rawValue}
                  </div>
                </div>
              </pre>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Example5;
