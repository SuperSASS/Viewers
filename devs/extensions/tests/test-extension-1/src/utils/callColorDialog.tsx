import React, { useState } from 'react';
import { Input, Dialog } from '@ohif/ui';
import { CirclePicker } from "react-color"

function callInputDialog(uiDialogService, handleChangeColor) {
  const dialogId = 'enter-segment-label';
  // const [selectColor, setSelectColor] = useState();
  let color = [0, 0, 0];

  const onChangeColor = (selectColor: { rgb: { r: number; g: number; a: number; }; }) => {
    color = [selectColor.rgb.r, selectColor.rgb.g, selectColor.rgb.a];
  }

  const onSubmitHandler = ({ action, value }) => {
    switch (action.id) {
      case 'ok':
        handleChangeColor(color);
        break;
      case 'cancel':
        break;
    }
    uiDialogService.dismiss({ id: dialogId });
  };

  if (uiDialogService) {
    uiDialogService.create({
      id: dialogId,
      centralize: true,
      isDraggable: false,
      showOverlay: true,
      content: Dialog,
      contentProps: {
        title: '请选择颜色',
        value: {},
        noCloseButton: true,
        onClose: () => uiDialogService.dismiss({ id: dialogId }),
        actions: [
          { id: 'cancel', text: '取消', type: 'primary' },
          { id: 'ok', text: '确认', type: 'secondary' },
        ],
        onSubmit: onSubmitHandler,
        body: ({ value, setValue }) => {
          return (
            <div className="p-6 bg-primary-dark">
              <CirclePicker
                // color={selectColor}
                onChangeComplete={onChangeColor}
              />
            </div>
          );
        },
      },
    });
  }
}

export default callInputDialog;
