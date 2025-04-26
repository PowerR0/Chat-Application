const {
  createMongoGroupChat,
  getMongoGroupChats,
  getMongoGroupByName,
  existMongoGroupHavingGroupName,
  getMongoGroupByChatId,
  joinMongoGroupChat,
  getGroupsForUser,
  getGroupMemberDetails,
} = require("../mongo_services/GroupChatMongoService");

const {
  getMongoDirectByChatId,
  getMongoDirectByUserId,
} = require("../mongo_services/DirectChatMongoService");

const {
  existMongoChatHavingChatId,
  updateMongoChatBackgroundImageByChatId,
} = require("../mongo_services/ChatMongoService");

class GroupChatService {
  constructor(io, socket) {
    this.socket = socket;
    this.io = io;

    socket.on("getGroups", () => this.getGroups());
    socket.on("getGroupById", (chatId) => this.getGroupById(chatId));
    socket.on("createGroup", ({ groupName, userId }) =>
      this.createGroup(groupName, userId)
    );
    socket.on("updateBackground", (updateInfo) =>
      this.updateBackground(updateInfo)
    );
    socket.on("getDirectByChatId", (ids) => this.getDirectByChatId(ids));
    socket.on("getDirectByUserId", (ids) => this.getDirectByUserId(ids));
    socket.on("joinGroup", ({ groupName, userId }) =>
      this.joinGroup(groupName, userId)
    );
    socket.on("get_my_groups", async (userId) => {
      const groups = await getGroupsForUser(userId);
      socket.emit("my_groups", groups);
    });

    // New event handler for getting group members
    socket.on("getGroupMembers", (chatId) => this.getGroupMembers(chatId));
  }

  getGroups() {
    this.socket.emit("get_groups_response", { message: "Success" });
    getMongoGroupChats().then((prevGroups) => {
      prevGroups.forEach((prevGroup) => {
        this.sendGroup(prevGroup);
      });
    });
  }

  getGroupById(chatId) {
    this.socket.emit("get_group_by_id_response", { message: "Success" });
    getMongoGroupByChatId(chatId).then((group) => {
      this.sendGroup(group);
    });
  }

  sendGroup(group) {
    const new_group = {
      _id: group._id,
      name: group.name,
      backgroundImage: group.background_image,
      members: group.members,
    };
    this.io.sockets.emit("group", new_group);
  }

  // New method to get and send group member details
  async getGroupMembers(chatId) {
    try {
      const memberDetails = await getGroupMemberDetails(chatId);

      this.socket.emit("get_group_members_response", {
        message: "Success",
      });

      this.socket.emit("group_members", memberDetails);
    } catch (error) {
      console.error("Error fetching group members:", error);
      this.socket.emit("get_group_members_response", {
        message: "Error fetching group members",
      });
    }
  }

  createGroup(groupName, userId) {
    // ตรวจสอบ groupName ให้มีความยาวที่ถูกต้อง
    if (groupName.length < 1) {
      this.socket.emit("create_group_response", {
        message: "GroupName should be at least 1 character",
      });
      return;
    }

    if (groupName.length > 20) {
      this.socket.emit("create_group_response", {
        message: "GroupName should be at most 20 characters",
      });
      return;
    }

    // ตรวจสอบว่ามี groupName นี้ใน MongoDB หรือไม่
    console.log("groupName", groupName);
    existMongoGroupHavingGroupName(groupName)
      .then((result) => {
        if (result) {
          this.socket.emit("create_group_response", {
            message: "GroupName already in use",
          });
          return;
        }

        // สร้างกลุ่มหลังจากผ่านการตรวจสอบ
        createMongoGroupChat(groupName, [userId])
          .then(() => {
            return getMongoGroupByName(groupName);
          })
          .then((group) => {
            this.sendGroup(group);
            this.socket.emit("create_group_response", { message: "Success" });
          })
          .catch((error) => {
            console.error("Error creating group:", error);
            this.socket.emit("create_group_response", {
              message: "Failed to create group due to an error",
            });
          });
      })
      .catch((error) => {
        console.error("Error checking if group exists:", error);
        this.socket.emit("create_group_response", {
          message: "Failed to check if group name exists",
        });
      });
  }

  updateBackground(updateInfo) {
    const { type, chatId, backgroundImage } = updateInfo;
    existMongoChatHavingChatId({ type: type, chat_id: chatId }).then(
      (result) => {
        if (result) {
          this.socket.emit("update_background_response", "Chat id is invalid");
          return;
        }

        // valid chat id and update background
        this.socket.emit("update_background_response", { message: "Success" });
        updateMongoChatBackgroundImageByChatId({
          type: type,
          chat_id: chatId,
          background_image: backgroundImage,
        });
      }
    );
  }

  getDirectByChatId(ids) {
    const { myUserId, chatId } = ids;
    getMongoDirectByChatId(ids).then((user) => {
      this.socket.emit("get_direct_by_chat_id_response", {
        chatId: chatId,
        message: "Success",
        username: user.username,
        userId: user._id,
        profileImage: user.profile_image,
        backgroundImage: user.background_image,
      });
    });
  }

  getDirectByUserId(ids) {
    getMongoDirectByUserId(ids).then((chat) => {
      this.socket.emit("get_direct_by_user_id_response", {
        message: "Success",
        chatId: chat ? chat._id : "",
      });
    });
  }

  joinGroup(groupName, userId) {
    joinMongoGroupChat(groupName, userId)
      .then((group) => {
        if (!group) {
          this.socket.emit("join_group_response", {
            message: "Failed to join group: Group not found",
          });
          return;
        }

        if (group.members.length >= 50) {
          this.socket.emit("join_group_response", {
            message: "Failed to join group: Group is full",
          });
          return;
        }

        this.socket.emit("join_group_response", {
          message: "Success",
          groupId: group._id,
          members: group.members,
        });
      })
      .catch((err) => {
        this.socket.emit("join_group_response", {
          message: "Failed to join group: " + err.message,
        });
      });
  }
}

module.exports = GroupChatService;
