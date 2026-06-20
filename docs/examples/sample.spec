Name:           hello
Version:        1.0.0
Release:        1%{?dist}
Summary:        A hello world application
License:        MIT
URL:            https://example.com/hello
Source0:        %{name}-%{version}.tar.gz
BuildRequires:  gcc make
Requires:       glibc

%description
A simple hello world application.

%prep
%autosetup

%build
make %{?_smp_mflags}

%install
make install DESTDIR=%{buildroot}

%files
%license LICENSE
%doc README.md
%{_bindir}/hello

%changelog
* Mon Jan 01 2024 Developer <dev@example.com> - 1.0.0-1
- Initial package
