import api from "./api";

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
    const response = await api.UploadFile(formData);
    console.log(response.data);
  }
  catch (e) { }
}

const selectFile = () => {
  const filesDOM = document.getElementById("fileInput");
  filesDOM.click();
}

export { uploadFile, selectFile };
