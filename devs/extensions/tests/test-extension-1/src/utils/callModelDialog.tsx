import React from 'react';
import { Input, Dialog } from '@ohif/ui';
// import api from "./api";
import api from "../../../../../utils/api"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function callModelDialog(uiDialogService, label, callback) {
  const dialogId = 'enter-segment-label';

  const onSubmitHandler = ({ action, value }) => {
    switch (action.id) {
      case 'save':
        callback(value.label, action.id);
        break;
      case 'cancel':
        callback('', action.id);
        break;
    }
    uiDialogService.dismiss({ id: dialogId });
  };

  const uploadModel = async () => {
    var files = document.getElementById('ModelFile').files;
    var modeldec = document.getElementById('Description').value;
    var modelname = document.getElementById('Name').value
    const formData = new FormData();
    console.log(modeldec);
    console.log(modelname);
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      formData.append('ModelFile', file, file.name);
    }
    formData.append('Description', modeldec);
    formData.append('Name', modelname);
    for (const [key, value] of formData.entries()) {
      console.log(key, value)
    }
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
  }

  if (uiDialogService) {
    uiDialogService.create({
      id: dialogId,
      centralize: true,
      isDraggable: false,
      showOverlay: true,
      content: Dialog,
      contentProps: {
        title: 'Enter Segment Label',
        value: { label },
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
              <input type="text"name="Name"id="Name"></input>
              <textarea rows="4" cols="50" id="Description">
                在这里输入文本...
              </textarea>
              <input type="file" name="ModelFile" id="ModelFile" multiple=""></input>
              <button onClick={uploadModel}>上传</button>
            </div>
          );
        },
      },
    });
  }
}

export default callModelDialog;
