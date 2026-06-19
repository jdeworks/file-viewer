name := "my-scala-app"

version := "0.5.0"

scalaVersion := "3.3.1"

organization := "com.example"

libraryDependencies ++= Seq(
  "org.typelevel" %% "cats-core"   % "2.10.0",
  "org.typelevel" %% "cats-effect" % "3.5.2",
  "co.fs2"        %% "fs2-core"    % "3.9.3",
  "io.circe"      %% "circe-core"  % "0.14.6",
  "io.circe"      %% "circe-generic" % "0.14.6",
  "org.scalatest" %% "scalatest"   % "3.2.17" % Test
)

scalacOptions ++= Seq(
  "-deprecation",
  "-feature",
  "-Xfatal-warnings"
)
