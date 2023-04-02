import api from "./api";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const uploadFile = async () => {
  const files = document.getElementById("fileInput").files;
  console.log(files);
  const formData = new FormData();
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    formData.append('filename', file, file.name);
    console.log(formData.get('filename'));
  }
  try {
    const response = await toast.promise(
      api.UploadFile(formData),
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

const selectFile = () => {
  const filesDOM = document.getElementById("fileInput");
  filesDOM.click();
}

export { uploadFile, selectFile };
