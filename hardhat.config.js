require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24",
    mocha: {
        reporter: 'mocha-multi-reporters',
        reporterOptions: {
            configFile: 'mocha-multi-reporters-config.json',
        },
    }
};
