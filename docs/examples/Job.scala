case class Job(id: String, retries: Int)

object JobRunner {
  def runnable(job: Job): Boolean = job.retries < 3

  def main(args: Array[String]): Unit = {
    val jobs = List(Job("import", 1), Job("archive", 4))
    println(jobs.filter(runnable).map(_.id).mkString(", "))
  }
}
