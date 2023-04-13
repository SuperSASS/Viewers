import React, { useState } from 'react';
import { Input, InputTextarea, Dialog, SegmentationGroupTable, Button, Icon } from '@ohif/ui';
// import api from "./api";
import api from "../../../../../utils/api"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function callModelDialog(uiDialogService, modelProps, callback) {
  const dialogId = 'upload-model-label';
  const { modelName, modelDescription } = modelProps;

  const onSubmitHandler = ({ action, value }) => {
    switch (action.id) {
      case 'save':
        uploadModel(value);
        break;
      case 'cancel':
        break;
    }
    uiDialogService.dismiss({ id: dialogId });
  };
  const uploadModel = async (modelValue) => {
    // var files = modelValue.modelFile;
    const files = document.getElementById("modelInput")?.files;
    var modeldec = modelValue.modelDescription;
    var modelname = modelValue.modelName;
    const formData = new FormData();
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      formData.append('ModelFile', file, file.name);
    }
    formData.append('Description', modeldec);
    formData.append('Name', modelname);
    try {
      const response = await toast.promise(
        api.UploadModel(formData),
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
  const selectModel = () => {
    const filesDOM = document.getElementById("modelInput");
    filesDOM.click();
    // console.log(1);
    // uploadModel();
  };
  if (uiDialogService) {
    uiDialogService.create({
      id: dialogId,
      centralize: true,
      isDraggable: false,
      showOverlay: true,
      content: Dialog,
      contentProps: {
        title: '上传模型',
        value: { modelName, modelDescription },
        noCloseButton: true,
        onClose: () => uiDialogService.dismiss({ id: dialogId }),
        actions: [
          { id: 'cancel', text: 'Cancel', type: 'primary' },
          { id: 'save', text: 'Confirm', type: 'secondary' },
        ],
        onSubmit: onSubmitHandler,
        body: ({ value, setValue }) => {
          return (
            <div className="p-4 bg-primary-dark">
              {/* <input type="text" name="Name" id="Name"></input> */}
              <Input
                data-cy="model-name"
                className="text-primary-light"
                value={value.modelName}
                onChange={event => {
                  event.persist();
                  setValue(value => ({ ...value, modelName: event.target.value }));
                }}
                label="模型名称"
                labelClassName="text-primary-light"
              />
              <InputTextarea
                data-cy="model-description"
                className="text-primary-light break-words"
                value={value.modelDescription}
                onChange={event => {
                  event.persist();
                  setValue(value => ({ ...value, modelDescription: event.target.value }));
                }}
                label="模型描述"
                labelClassName="text-primary-light"
              />
              <input type="file" name="ModelInput" id="modelInput" multiple className="invisible" />
              {/* /// *直接添加语句：这直接加的Button */}
              <Button onClick={selectModel} variant="outlined" rounded="full" size="special" className="mr-3 text-lg text-common-light">
                <Icon name="upload" className="stroke-current w-8 h-8 mr-auto ml-2"></Icon>
                <div className='mr-2'>上传模型对应的5个文件</div>
              </Button>
            </div>
          );
        },
      },
    });
  }
}

export default callModelDialog;
