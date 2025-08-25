const prisma = require("../config/prismaClient");

async function indexGet(request, response) {
  if (request.isAuthenticated()) {
    const foldersOfUser = await prisma.folder.findMany({
      where: {
        ownerId: request.user.id,
      },
    });
    for (const folder of foldersOfUser) {
      const files = await prisma.file.findMany({
        where: {
          folderId: folder.id,
        },
      });
      folder.numberOfFiles = files.length;
    }
    response.render("index", {
      user: request.user,
      folders: foldersOfUser,
    });
  } else {
    response.render("index");
  }
}

module.exports = { indexGet };
