const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User  = sequelize.define("user",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    full_name:{
        type:DataTypes.STRING,
    },
    username:{
        type:DataTypes.STRING,
        allowNull:false
    },
    password:{
        type:DataTypes.STRING,
        allowNull:false
    },
    role:{
        type:DataTypes.ENUM("كاتب","مدير"),
        defaultValue:"مدير"
    },
})
module.exports = User