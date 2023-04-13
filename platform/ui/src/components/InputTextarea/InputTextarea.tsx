import React from 'react';
import PropTypes from 'prop-types';
import Label from '../Label';
import classnames from 'classnames';

const baseInputClasses =
  'shadow transition duration-300 appearance-none border border-primary-main hover:border-gray-500 focus:border-gray-500 focus:outline-none rounded w-full py-2 px-3 text-sm text-white leading-tight focus:outline-none';

const transparentClasses = {
  true: 'bg-transparent',
  false: 'bg-black',
};

const Input = ({
  id,
  label,
  containerClassName = '',
  labelClassName = '',
  className = '',
  transparent = false,
  value,
  onChange,
  onFocus,
  autoFocus,
  onKeyDown,
  readOnly,
  disabled,
  ...otherProps
}) => {
  return (
    <div className={classnames('flex flex-col flex-1', containerClassName)}>
      <Label className={labelClassName} text={label}></Label>
      <textarea row
        data-cy={`input-${id}`}
        className={classnames(
          label && 'mt-2',
          className,
          baseInputClasses,
          transparentClasses[transparent],
          { 'cursor-not-allowed': disabled }
        )}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        {...otherProps}
      />
    </div>
  );
};

Input.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  containerClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  className: PropTypes.string,
  transparent: PropTypes.bool,
  value: PropTypes.any,
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  autoFocus: PropTypes.bool,
  readOnly: PropTypes.bool,
  onKeyDown: PropTypes.func,
  disabled: PropTypes.bool,
};

export default Input;
