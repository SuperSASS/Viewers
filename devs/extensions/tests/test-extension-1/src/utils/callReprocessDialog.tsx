import React from 'react';
import { Input, InputTextarea, Dialog, SegmentationGroupTable, Button, Icon } from '@ohif/ui';
import api from "../../../../../utils/api"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function callReprocessDialog(uiDialogService, reProps, callback) {
  const dialogId = 'reprocess-label';
  const { reScript } = reProps;
  const onSubmitHandler = ({ action, value }) => {
    switch (action.id) {
      case 'save':
        UploadReprocess(value);
        break;
      case 'cancel':
        break;
    }
    uiDialogService.dismiss({ id: dialogId });
  };
  const UploadReprocess = async (Script) => {
    // var files = modelValue.modelFile;
    var uploadscript = Script
    try {
      const response = await toast.promise(
        api.Reprocess(Script),
        {
          pending: '上传中，请稍后……',
          success: '上传成功！请刷新网页查看。',
          error: '上传失败，请稍后再试。'
        },
        {
          position: toast.POSITION.TOP_CENTER,
          theme: "colored",
        }
      );
      console.log(response.data);
    }
    catch (e) { }
  };
  if (uiDialogService) {
    uiDialogService.create({
      id: dialogId,
      centralize: true,
      isDraggable: false,
      showOverlay: true,
      content: Dialog,
      contentProps: {
        title: '输入python脚本',
        value: { reScript },
        noCloseButton: true,
        onClose: () => uiDialogService.dismiss({ id: dialogId }),
        actions: [
          { id: 'cancel', text: 'Cancel', type: 'primary' },
          { id: 'save', text: 'Confirm', type: 'secondary' },
        ],
        onSubmit: onSubmitHandler,
        body: ({ setValue }) => {
          return (
            <div className="p-4 bg-primary-dark">
              <InputTextarea
                data-cy="model-description"
                className="text-primary-light break-words"
                value={reScript}
                onChange={event => {
                  event.persist();
                  setValue(event.target.value);
                }}
                label="默认导入XXXXXX包，使用其他官方包需自己import"
                labelClassName="text-primary-light"
              />
            </div>
          );
        },
      },
    });
  }
}

export default callReprocessDialog;
