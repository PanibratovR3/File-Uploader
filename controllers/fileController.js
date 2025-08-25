const prisma = require("../config/prismaClient");
const { filesize } = require("filesize");
const fs = require("fs");

async function filesGet(request, response) {
  const { id } = request.params;
  const { name } = await prisma.folder.findUnique({
    where: {
      id: Number(id),
    },
  });
  const files = await prisma.file.findMany({
    where: {
      folderId: Number(id),
    },
  });
  for (const file of files) {
    file.size = filesize(file.size);
  }
  response.render("files", {
    fileName: name,
    folderId: id,
    files: files,
  });
}

async function createFilePost(request, response) {
  const { id } = request.params;
  const folderId = Number(id);
  const { filename, path, size } = request.file;
  await prisma.file.create({
    data: {
      name: filename,
      size: size,
      path: path,
      folderId: folderId,
    },
  });
  await prisma.folder.update({
    where: {
      id: folderId,
    },
    data: {
      dateOfModification: new Date(),
    },
  });
  response.redirect(`/folders/${folderId}/files`);
}

async function deleteFilePost(request, response) {
  const { folderId, fileId } = request.params;
  const file = await prisma.file.findUnique({
    where: {
      id: Number(fileId),
    },
  });
  const pathToDelete = file.path;
  fs.unlink(pathToDelete, (error) => {
    if (error) {
      return console.error(error);
    }
    console.log(
      `File ${file.name} was successfully deleted from uploading folder.`
    );
  });
  await prisma.file.delete({
    where: {
      id: file.id,
    },
  });
  await prisma.folder.update({
    where: {
      id: Number(folderId),
    },
    data: {
      dateOfModification: new Date(),
    },
  });
  response.redirect(`/folders/${folderId}/files`);
}

async function downloadFile(request, response) {
  const { fileId } = request.params;
  const file = await prisma.file.findUnique({
    where: {
      id: Number(fileId),
    },
  });
  const fileToDownload = file.path;
  response.download(fileToDownload);
}

module.exports = { filesGet, createFilePost, deleteFilePost, downloadFile };
