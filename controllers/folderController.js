const fs = require("fs");
const prisma = require("../config/prismaClient");
const path = require("path");

function createFolderGet(request, response) {
  response.render("createFolder");
}

async function createFolderPost(request, response) {
  const { folderName } = request.body;
  await prisma.folder.create({
    data: {
      name: folderName,
      ownerId: request.user.id,
    },
  });
  response.redirect("/");
}

async function updateFolderGet(request, response) {
  const { id } = request.params;
  const folder = await prisma.folder.findUnique({
    where: {
      id: Number(id),
    },
  });
  response.render("updateFolder", {
    folder: folder,
  });
}

async function updateFolderPost(request, response) {
  const { id } = request.params;
  const { folderName } = request.body;
  await prisma.folder.update({
    where: {
      id: Number(id),
    },
    data: {
      name: folderName,
      dateOfModification: new Date(),
    },
  });
  response.redirect("/");
}

async function deleteFolderPost(request, response) {
  const { id } = request.params;
  const filesToDelete = await prisma.file.findMany({
    where: {
      folderId: Number(id),
    },
  });
  for (const file of filesToDelete) {
    const filePath = file.path;
    fs.unlink(filePath, (error) => {
      if (error) {
        return console.error(error);
      }
      console.log(
        `File ${file.name} was successfully deleted from uploading folder.`
      );
    });
  }
  await prisma.file.deleteMany({
    where: {
      folderId: Number(id),
    },
  });
  await prisma.folder.delete({
    where: {
      id: Number(id),
    },
  });
  response.redirect("/");
}

module.exports = {
  createFolderGet,
  createFolderPost,
  updateFolderGet,
  updateFolderPost,
  deleteFolderPost,
};
