let express = require('express')
let router = express.Router()
let userController = require('../controllers/users')
let { RegisterValidator, ChangePasswordValidator, validatedResult } = require('../utils/validator')
let bcrypt = require('bcrypt')
let { signAccessToken } = require('../utils/jwtRs256')
const { check } = require('express-validator')
const { checkLogin } = require('../utils/authHandler')

router.post('/register', RegisterValidator, validatedResult, async function (req, res, next) {
    try {
        let { username, password, email } = req.body;
        let newUser = await userController.CreateAnUser(
            username, password, email, '69b2763ce64fe93ca6985b56'
        )
        res.send(newUser)
    } catch (err) {
        if (err && err.code === 11000) {
            res.status(409).send({
                message: "username hoac email da ton tai"
            })
            return;
        }
        res.status(400).send({
            message: err?.message || "register failed"
        })
    }
})
router.post('/login', async function (req, res, next) {
    let { username, password } = req.body;
    let user = await userController.FindUserByUsername(username);
    if (!user) {
        res.status(404).send({
            message: "thong tin dang nhap khong dung"
        })
        return;
    }
    if (!user.lockTime || user.lockTime < Date.now()) {
        if (bcrypt.compareSync(password, user.password)) {
            user.loginCount = 0;
            await user.save();
            let token = signAccessToken({
                id: user._id,
            }, {
                expiresIn: '1h'
            })
            res.send(token)
        } else {
            user.loginCount++;
            if (user.loginCount == 3) {
                user.loginCount = 0;
                user.lockTime = new Date(Date.now() + 60 * 60 * 1000)
            }
            await user.save();
            res.status(404).send({
                message: "thong tin dang nhap khong dung"
            })
        }
    } else {
        res.status(404).send({
            message: "user dang bi ban"
        })
    }

})
router.get('/me',checkLogin, function (req,res,next) {
    res.send(req.user)
})

router.post('/changepassword', checkLogin, ChangePasswordValidator, validatedResult, async function (req, res, next) {
    let { oldpassword, newpassword } = req.body;
    let user = req.user;
    if (!user) {
        res.status(404).send("ban chua dang nhap")
        return;
    }
    if (!bcrypt.compareSync(oldpassword, user.password)) {
        res.status(404).send({
            message: "mat khau cu khong dung"
        })
        return;
    }
    user.password = newpassword;
    await user.save();
    res.send({
        message: "doi mat khau thanh cong"
    })
})

module.exports = router;
