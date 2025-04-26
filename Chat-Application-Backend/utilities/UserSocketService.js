const {
  existMongoUserHavingUsername,
  createMongoUser,
  existMongoUser,
  getMongoUserByChatId,
  getMongoUserById,
  getMongoUsers,
  updateMongoUserById,
} = require("../mongo_services/UserMongoService");
const {
  createDirectChats,
} = require("../mongo_services/DirectChatMongoService");

class UserService {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;

    socket.on("test", (res) => console.log(res.message));

    // auth = username + password
    socket.on("register", (auth) => this.register(auth));
    // socket.on("register_response", (res: any) => console.log(res.message));
    // socket.emit("register", { username: username, password: password });

    socket.on("login", (auth) => this.login(auth));
    // socket.on("login_response", (res: any) => console.log(res.message));
    // socket.emit("login", { username: username, password: password });

    socket.on("getUsers", (myUserId) => this.getUsers(myUserId));
    // socket.on("user", userListener);
    // socket.on("get_users_response", (res: any) => console.log(res.message));
    // socket.emit("getUsers", myUserId);

    // ids = myUserId + chatId
    socket.on("getUserByChatId", (ids) => this.getUserByChatId(ids));
    // socket.on("get_user_by_chat_id_response", (res: any) => console.log(res.message));
    // socket.emit("getUserByChatId", ids);

    socket.on("getUserById", (userId) => this.getUserById(userId));
    // socket.on("get_user_by_id_response", (res: any) => console.log(res.message));
    // socket.emit("getUserById", userId);

    socket.on("getMe", (myUserId) => this.getMe(myUserId));
    // socket.on("get_me_response", (res: any) => console.log(res.message));
    // socket.emit("getMe", myUserId);

    //update information = my user id + new username + new user profile image
    socket.on("updateMe", (updateInfo) => this.updateMe(updateInfo));
    // socket.on("update_user_response", (res: any) => console.log(res.message));
    // socket.emit("updateMe", {
    //   myUserId: myUserId,
    //   username: username,
    //   profileImage: profileImage,
    // });
  }

  register(auth) {
    const { username, password } = auth;

    existMongoUserHavingUsername(username).then((result) => {
      // check at least username length
      if (username.length < 1) {
        this.socket.emit("register_response", {
          message: "Username should be at least 1 character",
        });
        return;
      }

      // check at most username length
      if (username.length > 20) {
        this.socket.emit("register_response", {
          message: "Username should be at most 20 characters",
        });
        return;
      }

      // check having username
      if (result) {
        this.socket.emit("register_response", {
          message: "Username already in use",
        });
        return;
      }

      // check at least password length
      if (password.length < 1) {
        this.socket.emit("register_response", {
          message: "Password should be at least 1 character",
        });
        return;
      }

      // check at most password length
      if (password.length > 20) {
        this.socket.emit("register_response", {
          message: "Password should be at most 20 characters",
        });
        return;
      }

      // valid username & password and create user
      createMongoUser(auth).then((newUser) => createDirectChats(newUser._id));
      this.socket.emit("register_response", { message: "Success" });
    });
  }

  login(auth) {
    existMongoUser(auth).then((result) => {
      // check having username
      console.log(result);
      if (result.success) {
        this.socket.emit("login_response", {
          message: "Success",
          userId: result.user_id,
          profileImage: result.profile_image,
          username: auth.username,
        });
        return;
      }

      this.socket.emit("login_response", {
        message: "Not found matching username and password",
      });
    });
  }

  getUsers(myUserId) {
    getMongoUserById(myUserId).then((me) => {
      if (me) {
        this.socket.emit("get_users_response", { message: "Success" });
        getMongoUsers(myUserId).then((users) => {
          users.forEach((user) => {
            this.sendUser({ user: user, myUserId: myUserId });
          });
        });
        return;
      } else {
        // cant find the user id
        this.socket.emit("get_users_response", {
          message: "Your user id is invalid",
        });
      }
    });
  }

  sendUser(userInfo) {
    const { user, myUserId } = userInfo;
    const new_user = {
      _id: user._id,
      myUserId: myUserId,
      username: user.username,
      profileImage: user.profile_image,
      chatId: user.chat_id,
    };
    this.io.sockets.emit("user", new_user);
  }

  getUserById(userId) {
    getMongoUserById(userId).then((user) => {
      if (user) {
        this.socket.emit("get_user_by_id_response", {
          message: "Success",
          username: user.username,
          profileImage: user.profile_image,
        });
      } else {
        // cant find the user id
        this.socket.emit("get_user_by_id_response", {
          message: "The user id is invalid",
        });
      }
    });
  }

  getUserByChatId(ids) {
    const { myUserId, chatId } = ids;
    // getMongoUserById(myUserId).then((me) => {
    //   if (me) {
    getMongoUserByChatId(ids).then((user) => {
      this.socket.emit("get_user_by_chat_id_response", {
        message: "Success",
        username: user.username,
        userId: user._id,
        profileImage: user.profile_image,
      });
    });
    //   } else {
    //     // cant find the user id
    //     this.socket.emit("get_user_by_chat_id_response", { message: "Your user id is invalid" });
    //   }
    // });
  }

  getMe(myUserId) {
    getMongoUserById(myUserId).then((me) => {
      if (me) {
        this.socket.emit("get_me_response", {
          message: "Success",
          username: me.username,
          profileImage: me.profile_image,
        });
      } else {
        // cant find the user id
        this.socket.emit("get_me_response", {
          message: "Your user id is invalid",
        });
      }
    });
  }

  updateMe(updateInfo) {
    const { myUserId, username, profileImage } = updateInfo;

    // ตรวจสอบว่า username มีการใช้งานแล้วหรือไม่
    existMongoUserHavingUsername(username)
      .then((result) => {
        if (result) {
          this.socket.emit("update_user_response", {
            message: "Username already in use", // ถ้าใช้งานแล้ว ส่งข้อความกลับ
          });
          return;
        } else {
          // ค้นหาผู้ใช้จาก user_id
          getMongoUserById(myUserId)
            .then((me) => {
              if (me) {
                // ตรวจสอบความยาวของ username
                if (username.length < 1) {
                  this.socket.emit("update_user_response", {
                    message: "Username should be at least 1 character", // ถ้ายาวน้อยกว่า 1 ตัว
                  });
                  return;
                }

                if (username.length > 20) {
                  this.socket.emit("update_user_response", {
                    message: "Username should be at most 20 characters", // ถ้ายาวเกินกว่า 20 ตัว
                  });
                  return;
                }

                // ถ้าผ่านการตรวจสอบ, อัปเดตข้อมูลผู้ใช้
                updateMongoUserById({
                  user_id: myUserId,
                  username: username,
                  profile_image: profileImage,
                })
                  .then(() => {
                    this.socket.emit("update_user_response", {
                      message: "Success", // การอัปเดตสำเร็จ
                    });
                  })
                  .catch((error) => {
                    this.socket.emit("update_user_response", {
                      message: "Error updating user data: " + error.message, // ถ้ามีข้อผิดพลาดในการอัปเดต
                    });
                  });
              } else {
                // ไม่พบ user_id ในฐานข้อมูล
                this.socket.emit("update_user_response", {
                  message: "Your user id is invalid", // แจ้งเตือนว่า user id ไม่ถูกต้อง
                });
              }
            })
            .catch((error) => {
              // ถ้าหากการค้นหาผู้ใช้เกิดข้อผิดพลาด
              this.socket.emit("update_user_response", {
                message: "Error fetching user data: " + error.message,
              });
            });
        }
      })
      .catch((error) => {
        // ถ้ามีข้อผิดพลาดในการตรวจสอบ username
        this.socket.emit("update_user_response", {
          message: "Error checking username: " + error.message,
        });
      });
  }
}

module.exports = UserService;
