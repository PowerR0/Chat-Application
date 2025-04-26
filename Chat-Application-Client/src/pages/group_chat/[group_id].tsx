import ChatBox from "@/component/chat/ChatBox";
import CenterList from "@/component/chat/CenterList";
import Message from "@/component/chat/message/Message";
import NavBar from "@/component/NavBar/NavBarGroup";
import { useContext, useEffect, useState } from "react";
import { SocketContext } from "@/context/SocketContext";
import { useRouter } from "next/router";
import useLocalStorage from "@/hook/useLocalStorage";
import { User } from "@/type/User";
import { GroupSocketType, MessageSocketType, ResType } from "@/type/Socket";
import { DEFAULT_CURRENT_USER, SOCKET_MESSAGE } from "@/type/Constant";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import ColorLensIcon from "@mui/icons-material/ColorLens";

// Add type for group member
interface GroupMember {
  userId: string;
  username: string;
  profileImage: string;
  isOnline?: boolean;
  role?: string; // admin, moderator, member, etc.
}

// Define color theme options
type ColorTheme = {
  name: string;
  myMessageBg: string;
  otherMessageBg: string;
};

// Create color themes
const colorThemes: ColorTheme[] = [
  { name: "Default", myMessageBg: "#e3f2fd", otherMessageBg: "#f5f5f5" },
  { name: "Dark", myMessageBg: "#303030", otherMessageBg: "#424242" },
  { name: "Colorful", myMessageBg: "#e8f5e9", otherMessageBg: "#fff3e0" },
  { name: "Professional", myMessageBg: "#e8eaf6", otherMessageBg: "#eceff1" },
];

export default function GroupChat() {
  const router = useRouter();
  const socket = useContext(SocketContext);
  const [currentUser, _] = useLocalStorage<User>("user_data");
  const chatId = router.query.group_id?.toString().replaceAll('"', "");
  const [messages, setMessages] = useState<{
    [key: string]: MessageSocketType;
  }>({});
  const [groupName, setGroupName] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [showMembers, setShowMembers] = useState<boolean>(true);

  // Add state for chat bubble colors
  const [colorThemeIndex, setColorThemeIndex] = useLocalStorage<number>(
    "chat-color-theme",
    0
  );
  const currentTheme = colorThemes[colorThemeIndex];

  useEffect(() => {
    if (JSON.stringify(currentUser) === JSON.stringify(DEFAULT_CURRENT_USER)) {
      router.push("/login");
      return;
    }
    if (chatId) {
      getMessages();
      getGroupInformation();
      getGroupMembers();
    }
  }, [socket, currentUser, router]);

  console.log("currentUser", currentUser);

  function getMessages() {
    const messageListener = (message: MessageSocketType) => {
      setMessages((prevMessages: { [key: string]: MessageSocketType }) => {
        const newMessages = { ...prevMessages };
        newMessages[message._id] = message;
        return newMessages;
      });
    };
    const identifier = {
      type: "Group",
      ownerId: currentUser.userId,
      chatId: chatId,
    };
    socket.on("get_messages_response", (res: ResType) =>
      console.log("Get Messages Status:", res.message)
    );
    socket.on("message", messageListener);
    socket.emit("getMessages", identifier);
  }

  function getGroupInformation() {
    const groupListener = (group: GroupSocketType) => {
      if (chatId === group._id) {
        setGroupName(group.name);
        setBackgroundImage(group.backgroundImage);
      }
    };
    socket.on("group", groupListener);
    socket.on("get_group_by_id_response", (res: ResType) =>
      console.log("Get Group Information Status:", res.message)
    );
    socket.emit("getGroupById", chatId);
  }

  // Add function to get group members
  function getGroupMembers() {
    const membersListener = (members: GroupMember[]) => {
      setGroupMembers(members);
    };
    socket.on("group_members", membersListener);
    socket.on("get_group_members_response", (res: ResType) =>
      console.log("Get Group Members Status:", res.message)
    );
    socket.emit("getGroupMembers", chatId);
    // Clean up listener when component unmounts
    return () => {
      socket.off("group_members", membersListener);
    };
  }

  // Toggle members sidebar
  const toggleMembersList = () => {
    setShowMembers(!showMembers);
  };

  // Toggle chat bubble color theme
  const toggleColorTheme = () => {
    setColorThemeIndex((prevIndex) => (prevIndex + 1) % colorThemes.length);
  };

  return (
    <>
      <NavBar
        label={groupName}
        chatId={chatId}
        onMembersClick={toggleMembersList}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "80vh",
        }}>
        {/* Color theme toggler */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            p: 1,
            bgcolor: "background.paper",
          }}>
          <Tooltip title={`Change color theme (Current: ${currentTheme.name})`}>
            <IconButton onClick={toggleColorTheme} color='primary' size='small'>
              <ColorLensIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Members sidebar */}
          {showMembers && (
            <Paper
              elevation={3}
              sx={{
                width: "250px",
                overflowY: "auto",
                height: "100%",
                borderRight: "1px solid #e0e0e0",
              }}>
              <Typography variant='h6' sx={{ p: 2, fontWeight: "bold" }}>
                Group Members ({groupMembers.length})
              </Typography>
              <Divider />
              <List>
                {groupMembers.map((member) => (
                  <ListItem key={member.userId} alignItems='flex-start'>
                    <ListItemAvatar>
                      <Avatar src={member.profileImage} alt={member.username} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          component='span'
                          variant='body1'
                          fontWeight={
                            member.role === "admin" ? "bold" : "regular"
                          }>
                          {member.username}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography
                            component='span'
                            variant='body2'
                            color={
                              member.isOnline
                                ? "success.main"
                                : "text.secondary"
                            }>
                            {/* {member.isOnline ? "Online" : "Offline"} */}
                          </Typography>
                          {member.role && (
                            <Typography
                              component='span'
                              variant='body2'
                              color='primary'
                              sx={{ ml: 1 }}>
                              {member.role}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Chat area */}
          <CenterList>
            <Box
              sx={{
                backgroundImage: `url(${backgroundImage})`,
                height: "max-content",
                minHeight: "80vh",
                paddingTop: "10px",
                width: "100%",
              }}>
              {[...Object.values(messages)]
                .sort(
                  (a: MessageSocketType, b: MessageSocketType) =>
                    a.createdAt.valueOf() - b.createdAt.valueOf()
                )
                .map(
                  (message: MessageSocketType) =>
                    message.chatId === chatId && (
                      <Message
                        key={message._id}
                        id={message._id}
                        userId={message.userId}
                        text={message.message}
                        isMine={message.isOwner}
                        avatar={message.profileImage}
                        type={"Group"}
                        senderName={message.username}
                        isLiked={message.isLiked}
                        totalLiked={message.like}
                        // Pass bubble color based on current theme
                        bubbleColor={
                          message.isOwner
                            ? currentTheme.myMessageBg
                            : currentTheme.otherMessageBg
                        }
                      />
                    )
                )}
            </Box>
          </CenterList>
        </Box>
      </Box>
      <ChatBox chatType='Group' id={chatId} />
    </>
  );
}
