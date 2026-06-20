unit Greeter;

interface

uses
  SysUtils, Classes;

type
  TPerson = class(TObject)
  private
    FName: string;
  public
    constructor Create(const AName: string);
    procedure Greet(const Name: string);
    function Add(A, B: Integer): Integer;
    property PersonName: string read FName write FName;
  end;

implementation

constructor TPerson.Create(const AName: string);
begin
  inherited Create;
  FName := AName;
end;

procedure TPerson.Greet(const Name: string);
begin
  WriteLn('Hello, ' + Name + '! I am ' + FName + '.');
end;

function TPerson.Add(A, B: Integer): Integer;
begin
  Result := A + B;
end;

end.
