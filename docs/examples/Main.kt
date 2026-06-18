data class User(val name: String, val roles: List<String>)

fun User.canDeploy(): Boolean = "admin" in roles || "release" in roles

fun main() {
    val users = listOf(
        User("Ada", listOf("admin")),
        User("Linus", listOf("viewer"))
    )
    println(users.filter { it.canDeploy() })
}
