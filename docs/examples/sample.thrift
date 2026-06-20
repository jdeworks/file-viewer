namespace java com.example.service
namespace go example.service
namespace py example.service

typedef i64 UserId
typedef string Email

enum UserStatus {
  ACTIVE = 1,
  INACTIVE = 2,
  BANNED = 3,
}

struct Address {
  1: required string street,
  2: required string city,
  3: optional string state,
  4: required string country,
  5: optional string postal_code,
}

struct User {
  1: required UserId id,
  2: required string username,
  3: required Email email,
  4: required UserStatus status,
  5: optional Address address,
  6: optional list<string> tags,
}

exception UserNotFoundException {
  1: required string message,
  2: required UserId user_id,
}

exception ValidationException {
  1: required string message,
  2: required map<string, string> field_errors,
}

service UserService {
  User getUser(1: required UserId id) throws (1: UserNotFoundException notFound),
  User createUser(1: required string username, 2: required Email email) throws (1: ValidationException invalid),
  void deleteUser(1: required UserId id) throws (1: UserNotFoundException notFound),
  list<User> listUsers(1: i32 limit = 50, 2: i32 offset = 0),
  bool updateStatus(1: required UserId id, 2: required UserStatus status),
}
