module FileSystem

sig File {}
sig Directory {
  contents: set File + Directory
}

one sig Root extends Directory {}

fact NoSelfContainment {
  no d: Directory | d in d.^contents
}

fact RootNotContained {
  no d: Directory | Root in d.contents
}

pred reachable[f: File, d: Directory] {
  f in d.contents
}

assert AllFilesReachable {
  all f: File | reachable[f, Root]
}

check AllFilesReachable for 5
run reachable for 4
