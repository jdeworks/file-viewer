import ballerina/http;
import ballerina/log;
import ballerina/time;
import ballerinax/mysql;
import ballerinax/mysql.driver as _;

// Configurable variables
configurable int port = 8080;
configurable string dbHost = "localhost";
configurable int dbPort = 3306;
configurable string dbName = "inventory";
configurable string dbUser = "root";
configurable string dbPassword = ?;

// Type definitions
type Product record {
    int id;
    string name;
    string category;
    decimal price;
    int stock;
    time:Utc createdAt;
};

type NewProduct record {|
    string name;
    string category;
    decimal price;
    int stock;
|};

type ErrorResponse record {|
    string message;
    string code;
|};

type ProductList record {|
    Product[] items;
    int total;
    int page;
    int pageSize;
|};

enum Category {
    ELECTRONICS,
    CLOTHING,
    FOOD,
    BOOKS,
    OTHER
}

const int MAX_PAGE_SIZE = 100;
const decimal MIN_PRICE = 0.01d;
const string API_VERSION = "v1";

// Database client
mysql:Client dbClient = check new (
    host = dbHost,
    port = dbPort,
    database = dbName,
    user = dbUser,
    password = dbPassword
);

// HTTP service
service /api/v1 on new http:Listener(port) {

    resource function get products(http:Caller caller, http:Request req) returns error? {
        int page = check req.getQueryParamValue("page").ensureType(int);
        int pageSize = int:min(
            check req.getQueryParamValue("size").ensureType(int),
            MAX_PAGE_SIZE
        );
        ProductList result = check getProducts(page, pageSize);
        check caller->respond(result);
    }

    resource function get products/[int id](http:Caller caller) returns error? {
        Product|error product = getProductById(id);
        if product is error {
            check caller->respond(http:STATUS_NOT_FOUND);
            return;
        }
        check caller->respond(product);
    }

    resource function post products(http:Caller caller, http:Request req) returns error? {
        NewProduct newProduct = check req.getJsonPayload().cloneWithType(NewProduct);
        Product created = check createProduct(newProduct);
        check caller->respond(created);
    }

    resource function put products/[int id](http:Caller caller, http:Request req) returns error? {
        NewProduct updates = check req.getJsonPayload().cloneWithType(NewProduct);
        Product updated = check updateProduct(id, updates);
        check caller->respond(updated);
    }

    remote function deleteProduct(int id) returns error? {
        check dbClient->execute(`DELETE FROM products WHERE id = ${id}`);
        log:printInfo("Deleted product", id = id);
    }
}

// Helper functions
isolated function getProducts(int page, int pageSize) returns ProductList|error {
    int offset = page * pageSize;
    stream<Product, error?> productStream = dbClient->query(
        `SELECT * FROM products LIMIT ${pageSize} OFFSET ${offset}`
    );
    Product[] items = check from Product p in productStream select p;
    int total = check dbClient->queryRow(`SELECT COUNT(*) FROM products`);
    return {items, total, page, pageSize};
}

isolated function getProductById(int id) returns Product|error {
    return dbClient->queryRow(`SELECT * FROM products WHERE id = ${id}`);
}

transactional function createProduct(NewProduct newProduct) returns Product|error {
    if newProduct.price < MIN_PRICE {
        return error("Price must be at least " + MIN_PRICE.toString());
    }
    sql:ExecutionResult result = check dbClient->execute(
        `INSERT INTO products (name, category, price, stock)
         VALUES (${newProduct.name}, ${newProduct.category}, ${newProduct.price}, ${newProduct.stock})`
    );
    int id = <int>result.lastInsertId;
    return getProductById(id);
}

isolated function updateProduct(int id, NewProduct updates) returns Product|error {
    check dbClient->execute(
        `UPDATE products SET name=${updates.name}, price=${updates.price},
         stock=${updates.stock} WHERE id=${id}`
    );
    return getProductById(id);
}

function formatCurrency(decimal amount) returns string {
    return "$" + amount.toFixedString(2);
}
