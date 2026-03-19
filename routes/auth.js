let express = require('express')
let router = express.Router()
let userController = require('../controllers/users')
let userModel = require('../schemas/users')
let { RegisterValidator, ChangePasswordValidator, ForgotPasswordValidator, ResetPasswordValidator, validatedResult } = require('../utils/validator')
let bcrypt = require('bcrypt')
let { signAccessToken } = require('../utils/jwtRs256')
let crypto = require('crypto')
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

router.post('/forgotpassword', ForgotPasswordValidator, validatedResult, async function (req, res, next) {
    try {
        let { email, username } = req.body;
        let user = null;
        if (username) {
            user = await userController.FindUserByUsername(username)
        } else if (email) {
            user = await userController.FindUserByEmail(email)
        }

        if (user) {
            let resetToken = crypto.randomBytes(32).toString('hex')
            let resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
            user.passwordResetTokenHash = resetTokenHash
            user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
            await user.save()

            if (process.env.NODE_ENV !== 'production') {
                res.send({
                    message: "neu tai khoan ton tai, he thong da tao reset token",
                    token: resetToken,
                    expiresAt: user.passwordResetExpiresAt
                })
                return;
            }
        }

        res.send({
            message: "neu tai khoan ton tai, he thong da gui huong dan khoi phuc mat khau"
        })
    } catch (err) {
        res.status(400).send({
            message: err?.message || "forgot password failed"
        })
    }
})

router.post('/resetpassword', ResetPasswordValidator, validatedResult, async function (req, res, next) {
    try {
        let { token, newpassword } = req.body;
        let resetTokenHash = crypto.createHash('sha256').update(token).digest('hex')
        let user = await userModel.findOne({
            passwordResetTokenHash: resetTokenHash,
            passwordResetExpiresAt: { $gt: new Date() },
            isDeleted: false
        })
        if (!user) {
            res.status(404).send({
                message: "token khong hop le hoac da het han"
            })
            return;
        }

        user.password = newpassword
        user.passwordResetTokenHash = null
        user.passwordResetExpiresAt = null
        user.loginCount = 0
        user.lockTime = null
        await user.save()

        let accessToken = signAccessToken({ id: user._id }, { expiresIn: '1h' })
        res.send({
            message: "doi mat khau thanh cong",
            token: accessToken
        })
    } catch (err) {
        res.status(400).send({
            message: err?.message || "reset password failed"
        })
    }
})

module.exports = router;
