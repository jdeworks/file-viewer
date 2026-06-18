Option Strict On

Public Module SampleReport
  Public Function FormatSize(bytes As Long) As String
    If bytes >= 1024 * 1024 Then
      Return $"{bytes / 1024 / 1024:N1} MB"
    End If

    Return $"{bytes / 1024:N1} KB"
  End Function

  Public Sub Main()
    Dim files = New Dictionary(Of String, Long) From {
      {"sample.pdf", 42100},
      {"worker.rs", 980},
      {"sample.png", 274000}
    }

    For Each entry In files
      Console.WriteLine($"{entry.Key}: {FormatSize(entry.Value)}")
    Next
  End Sub
End Module
