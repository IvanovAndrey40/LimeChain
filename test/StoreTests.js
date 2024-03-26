const {anyValue} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {expect} = require("chai");
const {mine} = require("@nomicfoundation/hardhat-network-helpers");

describe("Administrator (owner) tests", function () {
    let storeFactory, storeDeployment;

    beforeEach(async function () {
        const [owner] = await ethers.getSigners();

        storeFactory = await ethers.getContractFactory("Store");
        storeDeployment = await storeFactory.deploy(owner.address);
    });

    it("should allow owner to add a new product and quantity", async function () {
        const productName = "apple";

        await storeDeployment.addProduct(productName, 1);
        const product = await storeDeployment.getProductByName(productName);

        await expect(product.name).to.equal(productName)
        await expect(product.quantity).to.equal(1)
    });

    it("should not allow owner to add the same product twice, just quantity", async function () {
        const productName = "orange";

        await storeDeployment.addProduct(productName, 10);
        await storeDeployment.addProduct(productName, 10);

        expect(await storeDeployment.getAllProducts()).to.have.length(1);

        await storeDeployment.addProduct(productName, 1);

        const product = await storeDeployment.getProductByName(productName);

        expect(await storeDeployment.getAllProducts()).to.have.length(1);
        expect(product.name).to.equal(productName);
        expect(product.quantity).to.equal(1);
    });
});

describe("Buyers (clients) tests", function () {
    let storeFactory, storeDeployment, owner, buyer;

    beforeEach(async function () {
        [owner, buyer] = await ethers.getSigners();
        storeFactory = await ethers.getContractFactory("Store");
        storeDeployment = await storeFactory.deploy(owner.address);
    });

    it("should allow buyers (clients) to see the available products and buy them by their id", async function () {
        await storeDeployment.addProduct("banana", 10);

        expect(await storeDeployment.connect(buyer).getAllProducts()).to.have.length(1);
        expect(await storeDeployment.connect(buyer).buyProduct(0)).to.emit(storeDeployment, "ProductBought")
    });

    it("should not allow a client to buy the same product more than one time.", async function () {
        await storeDeployment.addProduct("banana", 10);

        await expect(storeDeployment.connect(buyer).buyProduct(0)).to.emit(storeDeployment, "ProductBought")
        await expect(storeDeployment.connect(buyer).buyProduct(0)).to.be.revertedWith("You cannot buy the same product more than once!");
    });


    it("should allow buyers be able to return products if they are not satisfied.", async function () {
        await storeDeployment.addProduct("banana", 10);
        await expect(storeDeployment.connect(buyer).buyProduct(0)).to.emit(storeDeployment, "ProductBought");

        await expect(storeDeployment.connect(buyer).refundProduct(0)).to.emit(storeDeployment, "ProductRefund");
        await expect(storeDeployment.connect(buyer).refundProduct(0)).to.be.revertedWith("You've already returned your product or didn't even bought it.");
    });

    it("should not allow buyer to return products after a certain period in blocktime: 100 blocks.", async function () {
        await storeDeployment.addProduct("banana", 10);
        expect(await storeDeployment.connect(buyer).buyProduct(0)).to.emit(storeDeployment, "ProductBought")

        await mine(100);
        await expect(storeDeployment.connect(buyer).refundProduct(0)).to.be.revertedWith("Sorry, your request for refund has been denied.");
    });
});

describe("Multiple Buyers (clients) tests ", function () {
    it("should not allow client to buy a product more times than the quantity in the store unless a product is returned or added by the administrator (owner)", async function () {
        const [owner, buyer, buyer2, buyer3] = await ethers.getSigners();

        const storeFactory = await ethers.getContractFactory("Store");
        const storeDeployment = await storeFactory.deploy(owner.address);

        await storeDeployment.addProduct("banana", 1);

        await expect(storeDeployment.connect(buyer).buyProduct(0)).to.emit(storeDeployment, "ProductBought");
        await expect(storeDeployment.connect(buyer2).buyProduct(0)).to.be.revertedWith("Quantity can't be 0!");

        await storeDeployment.updateProductQuantity(0, 1);

        await expect(storeDeployment.connect(buyer2).buyProduct(0)).to.emit(storeDeployment, "ProductBought");
        await expect(storeDeployment.connect(buyer2).refundProduct(0)).to.emit(storeDeployment, "ProductRefund");

        await expect(storeDeployment.connect(buyer3).buyProduct(0)).to.emit(storeDeployment, "ProductBought");
    });
});
