import React, {
  FC,
  useState,
  useEffect,
  useRef,
  forwardRef,
  useMemo,
  useImperativeHandle,
  useCallback,
} from 'react';
import { CurrencyInputProps, CurrencyInputOnChangeValues } from './CurrencyInputProps';
import {
  isNumber,
  cleanValue,
  fixedDecimalValue,
  formatValue,
  getLocaleConfig,
  padTrimValue,
  CleanValueOptions,
  getSuffix,
  FormatValueOptions,
  repositionCursor,
  evaluateMathExpressionSimple,
} from './utils';

export const CurrencyInput: FC<CurrencyInputProps> = forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(
  (
    {
      allowDecimals = true,
      allowNegativeValue = true,
      id,
      name,
      className,
      customInput,
      decimalsLimit,
      defaultValue,
      disabled = false,
      maxLength: userMaxLength,
      value: userValue,
      onValueChange,
      fixedDecimalLength,
      placeholder,
      decimalScale,
      prefix,
      suffix,
      intlConfig,
      step,
      min,
      max,
      disableGroupSeparators = false,
      disableAbbreviations = false,
      decimalSeparator: _decimalSeparator,
      groupSeparator: _groupSeparator,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      transformRawValue,
      formatValueOnBlur = true,
      ...props
    }: CurrencyInputProps,
    ref
  ) => {
    if (_decimalSeparator && isNumber(_decimalSeparator)) {
      throw new Error('decimalSeparator cannot be a number');
    }

    if (_groupSeparator && isNumber(_groupSeparator)) {
      throw new Error('groupSeparator cannot be a number');
    }

    const localeConfig = useMemo(() => getLocaleConfig(intlConfig), [intlConfig]);
    const decimalSeparator = _decimalSeparator || localeConfig.decimalSeparator || '';
    const groupSeparator = _groupSeparator || localeConfig.groupSeparator || '';

    if (
      decimalSeparator &&
      groupSeparator &&
      decimalSeparator === groupSeparator &&
      disableGroupSeparators === false
    ) {
      throw new Error('decimalSeparator cannot be the same as groupSeparator');
    }

    const formatValueOptions: Partial<FormatValueOptions> = {
      decimalSeparator,
      groupSeparator,
      disableGroupSeparators,
      intlConfig,
      prefix: prefix || localeConfig.prefix,
      suffix: suffix,
    };

    const cleanValueOptions: Partial<CleanValueOptions> = {
      decimalSeparator,
      groupSeparator,
      allowDecimals,
      decimalsLimit: decimalsLimit || fixedDecimalLength || 2,
      allowNegativeValue,
      disableAbbreviations,
      prefix: prefix || localeConfig.prefix,
      transformRawValue,
    };

    const [stateValue, setStateValue] = useState(() =>
      defaultValue != null
        ? formatValue({ ...formatValueOptions, decimalScale, value: String(defaultValue) })
        : userValue != null
          ? formatValue({ ...formatValueOptions, decimalScale, value: String(userValue) })
          : ''
    );
    const [dirty, setDirty] = useState(false);
    const [cursor, setCursor] = useState(0);
    const [changeCount, setChangeCount] = useState(0);
    const [lastKeyStroke, setLastKeyStroke] = useState<string | null>(null);
    const [lastValidValue, setLastValidValue] = useState<string>(() =>
      defaultValue != null
        ? formatValue({ ...formatValueOptions, decimalScale, value: String(defaultValue) })
        : userValue != null
          ? formatValue({ ...formatValueOptions, decimalScale, value: String(userValue) })
          : ''
    );
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    /**
     * Check if value contains math operators
     */
    const containsMathOperators = useCallback(
      (value: string): boolean => {
        const cleanValue = value.replace(prefix || '', '').replace(suffix || '', '');
        // Check for multiply, divide, percentage, parentheses
        if (/[*/%()+]/.test(cleanValue)) {
          return true;
        }
        // Check for minus/plus that's not at the start (to allow negative numbers)
        if (/[^-+][-+]/.test(cleanValue)) {
          return true;
        }
        return false;
      },
      [prefix, suffix]
    );

    /**
     * Process change in value
     */
    const processChange = (value: string, selectionStart?: number | null): void => {
      setDirty(true);

      // If value contains math operators, show raw input without formatting or cursor repositioning
      if (containsMathOperators(value)) {
        setStateValue(value);
        // Don't manipulate cursor for expressions - let it stay where user placed it
        // Still call onValueChange so controlled components can update
        if (onValueChange) {
          const cleanExpression = value.replace(prefix || '', '').replace(suffix || '', '').trim();
          onValueChange(cleanExpression, name, {
            float: null,
            formatted: value,
            value: cleanExpression,
          });
        }
        return;
      }

      const { modifiedValue, cursorPosition } = repositionCursor({
        selectionStart,
        value,
        lastKeyStroke,
        stateValue,
        groupSeparator,
      });

      const stringValue = cleanValue({ value: modifiedValue, ...cleanValueOptions });

      if (userMaxLength && stringValue.replace(/-/g, '').length > userMaxLength) {
        return;
      }

      if (stringValue === '' || stringValue === '-' || stringValue === decimalSeparator) {
        onValueChange && onValueChange(undefined, name, { float: null, formatted: '', value: '' });
        setStateValue(stringValue);
        setLastValidValue('');
        // Always sets cursor after '-' or decimalSeparator input
        setCursor(1);
        return;
      }

      const stringValueWithoutSeparator = decimalSeparator
        ? stringValue.replace(decimalSeparator, '.')
        : stringValue;

      const numberValue = parseFloat(stringValueWithoutSeparator);

      const formattedValue = formatValue({
        value: stringValue,
        ...formatValueOptions,
      });

      if (cursorPosition != null) {
        // Prevent cursor jumping
        let newCursor = cursorPosition + (formattedValue.length - value.length);
        newCursor = newCursor <= 0 ? (prefix ? prefix.length : 0) : newCursor;

        setCursor(newCursor);
        setChangeCount(changeCount + 1);
      }

      setStateValue(formattedValue);
      setLastValidValue(formattedValue);

      if (onValueChange) {
        const values: CurrencyInputOnChangeValues = {
          float: numberValue,
          formatted: formattedValue,
          value: stringValue,
        };
        onValueChange(stringValue, name, values);
      }
    };

    /**
     * Handle change event
     */
    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      const {
        target: { value, selectionStart },
      } = event;

      processChange(value, selectionStart);

      onChange && onChange(event);
    };

    /**
     * Handle focus event
     */
    const handleOnFocus = (event: React.FocusEvent<HTMLInputElement>): number => {
      onFocus && onFocus(event);
      return stateValue ? stateValue.length : 0;
    };

    /**
     * Handle blur event
     *
     * Format value by padding/trimming decimals if required by
     */
    const handleOnBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
      const {
        target: { value },
      } = event;

      // Check if value contains math operators and try to evaluate
      if (containsMathOperators(value)) {
        let cleanExpression = value.replace(prefix || '', '').replace(suffix || '', '').trim();
        // Remove group separators and replace decimal separator with '.'
        if (groupSeparator) {
          cleanExpression = cleanExpression.replace(new RegExp(`\\${groupSeparator}`, 'g'), '');
        }
        if (decimalSeparator && decimalSeparator !== '.') {
          cleanExpression = cleanExpression.replace(new RegExp(`\\${decimalSeparator}`, 'g'), '.');
        }
        const evaluatedResult = evaluateMathExpressionSimple(cleanExpression);

        if (evaluatedResult !== undefined) {
          // Valid expression - process the result
          processChange(String(evaluatedResult).replace('.', decimalSeparator));
          // Set cursor to the end (for when field regains focus)
          setTimeout(() => {
            if (inputRef.current && document.activeElement === inputRef.current) {
              const newLength = inputRef.current.value.length;
              inputRef.current.setSelectionRange(newLength, newLength);
            }
          }, 0);
        } else {
          // Invalid expression - restore last valid value
          setStateValue(lastValidValue);
        }
        onBlur && onBlur(event);
        return;
      }

      const valueOnly = cleanValue({ value, ...cleanValueOptions });

      if (valueOnly === '-' || valueOnly === decimalSeparator || !valueOnly) {
        setStateValue('');
        setLastValidValue('');
        onBlur && onBlur(event);
        return;
      }

      const fixedDecimals = fixedDecimalValue(valueOnly, decimalSeparator, fixedDecimalLength);

      const newValue = padTrimValue(
        fixedDecimals,
        decimalSeparator,
        decimalScale !== undefined ? decimalScale : fixedDecimalLength
      );

      const stringValueWithoutSeparator = decimalSeparator
        ? newValue.replace(decimalSeparator, '.')
        : newValue;

      const numberValue = parseFloat(stringValueWithoutSeparator);

      const formattedValue = formatValue({
        ...formatValueOptions,
        value: newValue,
      });

      if (onValueChange && formatValueOnBlur) {
        onValueChange(newValue, name, {
          float: numberValue,
          formatted: formattedValue,
          value: newValue,
        });
      }

      setStateValue(formattedValue);
      setLastValidValue(formattedValue);

      onBlur && onBlur(event);
    };

    /**
     * Handle key down event
     *
     * Increase or decrease value by step
     */
    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      const { key } = event;

      setLastKeyStroke(key);

      // Handle Enter key for math expression evaluation
      if (key === 'Enter') {
        const value = stateValue;
        if (containsMathOperators(value)) {
          event.preventDefault();
          let cleanExpression = value.replace(prefix || '', '').replace(suffix || '', '').trim();
          // Remove group separators and replace decimal separator with '.'
          if (groupSeparator) {
            cleanExpression = cleanExpression.replace(new RegExp(`\\${groupSeparator}`, 'g'), '');
          }
          if (decimalSeparator && decimalSeparator !== '.') {
            cleanExpression = cleanExpression.replace(new RegExp(`\\${decimalSeparator}`, 'g'), '.');
          }
          const evaluatedResult = evaluateMathExpressionSimple(cleanExpression);

          if (evaluatedResult !== undefined) {
            // Valid expression - process the result
            processChange(String(evaluatedResult).replace('.', decimalSeparator));
            // Set cursor to the end
            setTimeout(() => {
              if (inputRef.current) {
                const newLength = inputRef.current.value.length;
                inputRef.current.setSelectionRange(newLength, newLength);
              }
            }, 0);
          } else {
            // Invalid expression - restore last valid value
            setStateValue(lastValidValue);
          }
          return;
        }
      }

      if (step && (key === 'ArrowUp' || key === 'ArrowDown')) {
        event.preventDefault();
        setCursor(stateValue.length);

        const stringValue = userValue != null ? String(userValue) : undefined;
        const stringValueWithoutSeparator =
          decimalSeparator && stringValue
            ? stringValue.replace(decimalSeparator, '.')
            : stringValue;

        const currentValue =
          parseFloat(
            stringValueWithoutSeparator != null
              ? stringValueWithoutSeparator
              : cleanValue({ value: stateValue, ...cleanValueOptions })
          ) || 0;
        const newValue = key === 'ArrowUp' ? currentValue + step : currentValue - step;

        if (
          (min !== undefined && newValue < Number(min)) ||
          (!allowNegativeValue && newValue < 0)
        ) {
          return;
        }

        if (max !== undefined && newValue > Number(max)) {
          return;
        }

        const fixedLength = String(step).includes('.')
          ? Number(String(step).split('.')[1].length)
          : undefined;

        processChange(
          String(fixedLength ? newValue.toFixed(fixedLength) : newValue).replace(
            '.',
            decimalSeparator
          )
        );
      }

      onKeyDown && onKeyDown(event);
    };

    /**
     * Handle key up event
     *
     * Move cursor if there is a suffix to prevent user typing past suffix
     */
    const handleOnKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
      const {
        key,
        currentTarget: { selectionStart },
      } = event;
      
      // Skip cursor manipulation for math expressions
      if (key !== 'ArrowUp' && key !== 'ArrowDown' && stateValue !== '-' && !containsMathOperators(stateValue)) {
        const suffix = getSuffix(stateValue, { groupSeparator, decimalSeparator });

        if (suffix && selectionStart && selectionStart > stateValue.length - suffix.length) {
          /* istanbul ignore else */
          if (inputRef.current) {
            const newCursor = stateValue.length - suffix.length;
            inputRef.current.setSelectionRange(newCursor, newCursor);
          }
        }
      }

      onKeyUp && onKeyUp(event);
    };

    // Update state if userValue changes to undefined
    useEffect(() => {
      if (userValue == null && defaultValue == null) {
        setStateValue('');
      }
    }, [defaultValue, userValue]);

    useEffect(() => {
      // prevent cursor jumping if editing value
      // Skip cursor manipulation if value contains math operators
      if (
        dirty &&
        stateValue !== '-' &&
        !containsMathOperators(stateValue) &&
        inputRef.current &&
        document.activeElement === inputRef.current
      ) {
        inputRef.current.setSelectionRange(cursor, cursor);
      }
    }, [stateValue, cursor, inputRef, dirty, changeCount, containsMathOperators]);

    /**
     * If user has only entered "-" or decimal separator,
     * keep the char to allow them to enter next value
     */
    const getRenderValue = () => {
      if (
        userValue != null &&
        stateValue !== '-' &&
        (!decimalSeparator || stateValue !== decimalSeparator)
      ) {
        return formatValue({
          ...formatValueOptions,
          decimalScale: dirty ? undefined : decimalScale,
          value: String(userValue),
        });
      }

      return stateValue;
    };

    const inputProps: React.ComponentPropsWithRef<'input'> = {
      type: 'text',
      inputMode: 'decimal',
      id,
      name,
      className,
      onChange: handleOnChange,
      onBlur: handleOnBlur,
      onFocus: handleOnFocus,
      onKeyDown: handleOnKeyDown,
      onKeyUp: handleOnKeyUp,
      placeholder,
      disabled,
      value: getRenderValue(),
      ref: inputRef,
      ...props,
    };

    if (customInput) {
      const CustomInput = customInput;
      return <CustomInput {...inputProps} />;
    }

    return <input {...inputProps} />;
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
