import axios from "axios";

class User {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.axios = axios.create({
      headers: {
        accept: "application/json",
        "accept-language": "zh-CN,zh;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json; charset=UTF-8",
        expires: "0",
        pragma: "no-cache",
        priority: "u=1, i",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        Referer: "https://app.allstream.ai/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    });
  }

  async login() {
    const { email, password } = this;
    console.log(email, password , 'email, password')
    const res =  await this.axios.post(
      "https://api.allstream.ai/web/v1/auth/emailLogin",
      {
        code: "",
        email,
        password,
        referralCode: "",
      }
    );
    this.token = res?.data?.data?.token;
  }

  async getUserInfo () {
    const res =  await this.axios.get(
      "https://api.allstream.ai/web/v1/auth/myInfo",
      {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      }
    );
    return res?.data?.data.uuid;
  }

}

export { User };
