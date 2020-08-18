import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Icon, Typography, Select } from '@ohif/ui';

const StudyListPagination = ({
  onChangePage,
  currentPage,
  perPage,
  onChangePerPage,
}) => {
  const navigateToPage = page => {
    const toPage = page < 1 ? 1 : page;
    onChangePage(toPage);
  };

  const ranges = [
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];
  const [selectedRange, setSelectedRange] = useState(ranges.find(r => r.value == perPage));
  const onSelectedRange = (selectedRange) => {
    setSelectedRange(selectedRange);
    onChangePerPage(selectedRange.value);
  };

  return (
    <div className="bg-black py-10">
      <div className="container m-auto relative px-8">
        <div className="flex justify-between">
          <div className="flex items-center">
            <Select
              className="relative mr-3 w-16"
              options={ranges}
              value={selectedRange}
              isMulti={false}
              isClearable={false}
              isSearchable={false}
              closeMenuOnSelect={false}
              hideSelectedOptions={true}
              onChange={onSelectedRange}
            />
            <Typography className="text-base opacity-60">
              Results per page
            </Typography>
          </div>
          <div className="">
            <div className="flex items-center">
              <Typography className="opacity-60 mr-4 text-base">
                Page {currentPage}
              </Typography>
              <ButtonGroup color="primary">
                <Button
                  size="initial"
                  className="border-common-active px-4 py-2 text-base"
                  color="white"
                  onClick={() => navigateToPage(1)}
                >
                  {`<<`}
                </Button>
                <Button
                  size="initial"
                  className="border-common-active py-2 px-2 text-base"
                  color="white"
                  onClick={() => navigateToPage(currentPage - 1)}
                >{`< Previous`}</Button>
                <Button
                  size="initial"
                  className="border-common-active py-2 px-4 text-base"
                  color="white"
                  onClick={() => navigateToPage(currentPage + 1)}
                >
                  {`Next >`}
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

StudyListPagination.propTypes = {
  onChangePage: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  onChangePerPage: PropTypes.func.isRequired,
};

export default StudyListPagination;
