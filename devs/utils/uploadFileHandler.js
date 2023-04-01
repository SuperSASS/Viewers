import api from "./api";

const uploadFile = async () => {
  var files = document.getElementById("fileInput");
  files.click();
  console.log(files);
  const formData = new FormData();
  for (var i = 0; i < files.files.length; i++) {
    var file = files[i];
    formData.append('filename', file, file.name);
    console.log(formData.get('filename'));
  }
  const response = await api.UploadFile(formData);
  console.log(response.data);
}

export default uploadFile;
