const should = require('should');
const packages = require('../src/lib/packages');

describe('packages.validate_base_pkg_data', () => {
  it('should say the package is bady formed when the package name is too short', () => {
    const pkg_data = { name: '' };
    const pkg_data1 = { name: 'a' };
    const pkg_data2 = { name: 'aa' };

    should.exist(packages.validate_base_pkg_data(pkg_data));
    should.equal(false, packages.validate_base_pkg_data(pkg_data).success);
    should.exist(packages.validate_base_pkg_data(pkg_data1));
    should.equal(false, packages.validate_base_pkg_data(pkg_data1).success);
    should.exist(packages.validate_base_pkg_data(pkg_data2));
    should.equal(false, packages.validate_base_pkg_data(pkg_data2).success);
  });

  it('should return nothing when the package data is an empty object', () => {
    const pkg_data = {};
    should.equal(null, packages.validate_base_pkg_data(pkg_data));
  });

  it('should return error object when any of the dependencies have no version', () => {
    const pkg_data = { dependencies: [{ name: 'bla' }, { name: 'bloo', version: '0.0.1' }] };

    should.equal(false, packages.validate_base_pkg_data(pkg_data).success);
  });

  it('should return error object when any of the dependencies have badly formed version', () => {
    const pkg_data = { dependencies: [{ name: 'bloo', version: '0.0.x1' }] };

    should.equal(false, packages.validate_base_pkg_data(pkg_data).success);
  });

  it('should return error object when the description is too short', () => {
    const pkg_data = { description: '' };
    should.equal(false, packages.validate_base_pkg_data(pkg_data).success);
  });

  it('should return error object when there are duplicate keywords', () => {
    const pkg_data = { keywords: ['ok', 'ok'] };
    should.equal(false, packages.validate_base_pkg_data(pkg_data).success);
  });

  it('should return error object when there are too many keywords', () => {
    const pkg_data = { keywords: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] };

    should.equal(false, packages.validate_base_pkg_data(pkg_data).success);
  });

  it('should return null when the license is supported', () => {
    const pkg_data = { license: 'MIT' };
    should.not.exist(packages.validate_base_pkg_data(pkg_data));
  });
});

describe('packages.validate_version_string', () => {
  it('should say the string is well-formed when a string of form \'digits.digits.digits\'', () => {
    const max_value = 100;
    let major = 0;
    let minor = 0;
    let rev = 0;
    let vers_string = '';

    for (let i = 0; i < 1000; i++) {
      major = Math.floor(Math.random() * max_value);
      minor = Math.floor(Math.random() * max_value);
      rev = Math.floor(Math.random() * max_value);

      vers_string = `${major.toString()}.${minor.toString()}.${rev.toString()}`;

      should.equal(true, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is well-formed when a string of form \'~digits.digits.digits\'', () => {
    const max_value = 100;
    let major = 0;
    let minor = 0;
    let rev = 0;
    let vers_string = '';

    for (let i = 0; i < 1000; i++) {
      major = Math.floor(Math.random() * max_value);
      minor = Math.floor(Math.random() * max_value);
      rev = Math.floor(Math.random() * max_value);

      vers_string = `~${major.toString()}.${minor.toString()}.${rev.toString()}`;

      should.equal(true, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is well-formed when a string of form \'~digits.digits.*\'', () => {
    const max_value = 100;
    let major = 0;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < 1000; i++) {
      major = Math.floor(Math.random() * max_value);
      minor = Math.floor(Math.random() * max_value);

      vers_string = `~${major.toString()}.${minor.toString()}.*`;

      should.equal(true, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is well-formed when a string of form \'digits.digits.*\'', () => {
    const max_value = 100;
    let major = 0;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < 1000; i++) {
      major = Math.floor(Math.random() * max_value);
      minor = Math.floor(Math.random() * max_value);

      vers_string = `${major.toString()}.${minor.toString()}.*`;

      should.equal(true, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is well-formed when a string of form \'>=digits.digits.*\'', () => {
    const max_value = 100;
    let major = 0;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < 1000; i++) {
      major = Math.floor(Math.random() * max_value);
      minor = Math.floor(Math.random() * max_value);

      vers_string = `>=${major.toString()}.${minor.toString()}.*`;

      should.equal(true, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is well-formed when a string of form \'>=digits.digits.digits\'', () => {
    const max_value = 100;
    let major = 0;
    let minor = 0;
    let rev = 0;
    let vers_string = '';

    for (let i = 0; i < 1000; i++) {
      major = Math.floor(Math.random() * max_value);
      minor = Math.floor(Math.random() * max_value);
      rev = Math.floor(Math.random() * max_value);

      vers_string = `>=${major.toString()}.${minor.toString()}.${rev.toString()}`;

      should.equal(true, packages.validate_version_string(vers_string));
    }
  });


  it('should say the string is badly-formed when a string of form \'.digits.digits\'', () => {
    const max_value = 1000;
    let minor = 0;
    let rev = 0;
    let vers_string = '';

    for (let i = 0; i < max_value; i++) {
      minor = Math.floor(Math.random() * max_value);
      rev = Math.floor(Math.random() * max_value);

      vers_string = `.${minor.toString()}.${rev.toString()}`;

      should.equal(false, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is badly-formed when a string of form \'digits.digits\'', () => {
    const max_value = 1000;
    let minor = 0;
    let rev = 0;
    let vers_string = '';

    for (let i = 0; i < max_value; i++) {
      minor = Math.floor(Math.random() * max_value);
      rev = Math.floor(Math.random() * max_value);

      vers_string = `${minor.toString()}.${rev.toString()}`;

      should.equal(false, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is badly-formed when a string of form \'digits\'', () => {
    const max_value = 1000;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < max_value; i++) {
      minor = Math.floor(Math.random() * max_value);

      vers_string = minor.toString();

      should.equal(false, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is badly-formed when a string of form \'>=digits\'', () => {
    const max_value = 1000;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < max_value; i++) {
      minor = Math.floor(Math.random() * max_value);

      vers_string = `>=${minor.toString()}`;

      should.equal(false, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is badly-formed when a string of form \'>=digits.*\'', () => {
    const max_value = 1000;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < max_value; i++) {
      minor = Math.floor(Math.random() * max_value);

      vers_string = `>=${minor.toString()}.*`;

      should.equal(false, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is badly-formed when a string of form \'..\'', () => {
    should.equal(false, packages.validate_version_string('..'));
  });

  it('should say the string is badly-formed when a string of form \'digits..\'', () => {
    const max_value = 1000;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < max_value; i++) {
      minor = Math.floor(Math.random() * max_value);

      vers_string = `${minor.toString()}..`;

      should.equal(false, packages.validate_version_string(vers_string));
    }
  });

  it('should say the string is badly-formed when a string of form \'digits..*\'', () => {
    const max_value = 1000;
    let minor = 0;
    let vers_string = '';

    for (let i = 0; i < max_value; i++) {
      minor = Math.floor(Math.random() * max_value);

      vers_string = `${minor.toString()}..*`;

      should.equal(false, packages.validate_version_string(vers_string));
    }
  });
});
