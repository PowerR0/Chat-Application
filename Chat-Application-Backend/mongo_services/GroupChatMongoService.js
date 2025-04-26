const GroupChat = require("../models/GroupChat");
const User = require("../models/User"); // Assuming you have a User model

async function createMongoGroupChat(groupName, members) {
  await GroupChat.create({ name: groupName, members });
  return;
}

async function getMongoGroupChats() {
  const groupChats = await GroupChat.find({});
  return groupChats;
}

async function getMongoGroupByChatId(chatId) {
  const groupChat = await GroupChat.findById(chatId);
  return groupChat;
}

async function getMongoGroupByName(groupName) {
  const selectedGroup = await GroupChat.find({ name: groupName });
  return selectedGroup[0];
}

async function updateMongoGroupBackground({ groupName, backgroundUrl }) {
  await GroupChat.findOneAndUpdate(
    { name: groupName },
    { background_image: backgroundUrl }
  );
  return;
}

function existMongoGroupHavingGroupName(groupName) {
  return GroupChat.findOne({ name: groupName })
    .then((group) => {
      return group ? true : false;
    })
    .catch((error) => {
      console.error("Error checking group existence:", error);
      return false;
    });
}

async function existMongoGroupChatById(groupId) {
  const group = await GroupChat.findById(groupId);
  return !!group;
}

async function joinMongoGroupChat(groupName, userId) {
  // Find the group by name instead of ID
  const group = await GroupChat.findOne({ name: groupName });
  if (!group) throw new Error("Group not found");

  // Prevent duplicate joins
  if (!group.members.includes(userId)) {
    group.members.push(userId);
    await group.save();
  }

  return group;
}

async function getGroupsForUser(userId) {
  return GroupChat.find({ members: userId }).populate("members");
}

// New function to get detailed information about group members
async function getGroupMemberDetails(chatId) {
  try {
    // Find the group and get its members array
    const group = await GroupChat.findById(chatId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Get detailed information for each member
    const memberPromises = group.members.map(async (memberId) => {
      const user = await User.findById(memberId);
      if (!user) return null;

      return {
        userId: user._id,
        username: user.username,
        profileImage: user.profile_image || "",
        isOnline: user.is_online || false,
        role: user.role || "member", // Default role if not specified
        lastActive: user.last_active || new Date(),
      };
    });

    // Filter out any null values from users that weren't found
    const memberDetails = (await Promise.all(memberPromises)).filter(
      (member) => member !== null
    );

    return memberDetails;
  } catch (error) {
    console.error("Error in getGroupMemberDetails:", error);
    throw error;
  }
}

module.exports = {
  createMongoGroupChat,
  getMongoGroupChats,
  getMongoGroupByChatId,
  getMongoGroupByName,
  updateMongoGroupBackground,
  existMongoGroupHavingGroupName,
  existMongoGroupChatById,
  joinMongoGroupChat,
  getGroupsForUser,
  getGroupMemberDetails, // Export the new function
};
